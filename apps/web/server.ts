/**
 * Custom Next.js server — adds WebSocket support for the Gemini Live proxy.
 *
 * Next.js App Router route handlers cannot handle WebSocket upgrades.
 * This server intercepts upgrade requests to /api/gemini/live and proxies
 * them to the Gemini Live API, keeping the API key server-side.
 *
 * All other requests are handled by Next.js as normal.
 */

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { WebSocket, WebSocketServer } from 'ws'
import { getSystemInstruction } from '@talkingo/shared/gemini'
import { getPersonaById } from '@talkingo/shared/gemini/personas'
import type { ConversationState } from '@talkingo/shared/types'
import { Client, Databases, Account, Query } from 'node-appwrite'
import { APPWRITE_DB_ID, COLLECTION_IDS } from './src/lib/appwrite-schema'

// ─── Master prompt cache (refreshed every 5 min) ──────────────────────────────
let _cachedMasterPrompt: string | null = null
let _masterPromptFetchedAt = 0
const MASTER_PROMPT_TTL = 5 * 60 * 1000

async function getLiveMasterPrompt(): Promise<string | null> {
  const now = Date.now()
  if (_cachedMasterPrompt && now - _masterPromptFetchedAt < MASTER_PROMPT_TTL) {
    return _cachedMasterPrompt
  }
  try {
    // system_config has read("any") permission — no API key needed for this
    // public read. Anyone with the project ID can fetch the master prompt.
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    const databases = new Databases(client)
    const res = await databases.listDocuments(APPWRITE_DB_ID, COLLECTION_IDS.SYSTEM_CONFIG, [
      Query.equal('key', 'master_prompt'),
      Query.limit(1),
    ])
    if (res.documents.length > 0) {
      _cachedMasterPrompt = (res.documents[0] as any).value ?? null
      _masterPromptFetchedAt = now
      return _cachedMasterPrompt
    }
  } catch (e) {
    console.warn('[live-proxy] Could not fetch master prompt from DB, using default:', e)
  }
  return null
}

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME ?? 'localhost'
const port = parseInt(process.env.PORT ?? '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview'
const GEMINI_LIVE_WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? '/', true)
    handle(req, res, parsedUrl)
  })

  // ── WebSocket upgrade handler ──────────────────────────────────────────
  const wss = new WebSocketServer({ noServer: true })

  httpServer.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url ?? '/')

    // Allow Next.js HMR WebSocket connections
    if (pathname?.startsWith('/_next/webpack-hmr')) {
      // Let Next.js handle HMR WebSocket upgrades
      return
    }

    if (pathname === '/api/gemini/live') {
      // ── Auth: verify Appwrite JWT ──────────────────────────────────────
      // Mirrors the auth-guard used by /api/* routes. WebSocket clients send
      // the JWT as a query param because browsers can't attach custom headers
      // to a WebSocket upgrade request.
      const parsedWsUrl = parse(req.url ?? '/', true)
      const queryJwt = parsedWsUrl.query?.jwt as string | undefined
      // Accept legacy `?session=` for any clients that haven't refreshed yet,
      // but treat it as a JWT (clients have moved to JWT auth).
      const queryFallback = parsedWsUrl.query?.session as string | undefined
      const jwt = queryJwt || queryFallback

      if (!jwt) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
        socket.destroy()
        return
      }

      // Verify the JWT against Appwrite before upgrading. This blocks anyone
      // from binding the live model with a forged token.
      verifyAppwriteJwt(jwt)
        .then((userId) => {
          if (!userId) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
            socket.destroy()
            return
          }
          wss.handleUpgrade(req, socket as any, head, (clientWs) => {
            handleLiveSession(clientWs, userId)
          })
        })
        .catch(() => {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
          socket.destroy()
        })
    } else {
      socket.destroy()
    }
  })

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
  })
})

// ─── Live session handler ──────────────────────────────────────────────────────

/**
 * Verify an Appwrite JWT. Returns the user id on success, null otherwise.
 * Mirrors src/lib/api/auth-guard.ts for HTTP routes.
 */
async function verifyAppwriteJwt(jwt: string): Promise<string | null> {
  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
      .setJWT(jwt)
    const account = new Account(client)
    const user = await account.get()
    return user.$id ?? null
  } catch (err) {
    console.warn('[live-proxy] JWT verify failed:', (err as Error).message)
    return null
  }
}

function handleLiveSession(clientWs: WebSocket, userId: string) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    clientWs.send(JSON.stringify({ type: 'error', message: 'GEMINI_API_KEY not configured' }))
    clientWs.close(1011)
    return
  }

  console.log('[live-proxy] Session opened for user:', userId)

  let geminiWs: WebSocket | null = null
  let setupDone = false
  /** True after we've sent `ready` to the client. */
  let readySent = false

  const sendToClient = (msg: object) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify(msg))
    }
  }

  clientWs.on('message', async (raw) => {
    let msg: any
    try { msg = JSON.parse(raw.toString()) } catch {
      sendToClient({ type: 'error', message: 'Invalid JSON' })
      return
    }

    // ── Setup ──
    if (msg.type === 'setup') {
      if (setupDone) return
      setupDone = true

      const state: ConversationState = msg.state ?? {}
      const persona = getPersonaById(state.persona ?? 'eli')
      const voiceName: string = msg.voiceName ?? persona?.voiceName ?? 'Aoede'
      // Fetch master prompt from DB (with cache) so live mode respects admin changes
      const masterPrompt = await getLiveMasterPrompt()
      const systemInstruction = buildLiveSystemInstruction(state, masterPrompt ?? undefined)

      const url = `${GEMINI_LIVE_WS}?key=${apiKey}`
      geminiWs = new WebSocket(url)

      geminiWs.on('open', () => {
        const setup = {
          setup: {
            model: `models/${LIVE_MODEL}`,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
              },
            },
            realtimeInputConfig: {
              automaticActivityDetection: {
                disabled: false,
                startOfSpeechSensitivity: 'START_SENSITIVITY_LOW',
                endOfSpeechSensitivity: 'END_SENSITIVITY_LOW',
                prefixPaddingMs: 200,
                silenceDurationMs: 600,
              },
            },
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
        }
        geminiWs!.send(JSON.stringify(setup))
      })

      geminiWs.on('message', (data) => {
        let serverMsg: any
        try { serverMsg = JSON.parse(data.toString()) } catch { return }
        handleGeminiMessage(serverMsg, sendToClient, () => {
          readySent = true
          sendToClient({ type: 'ready' })
        })
      })

      geminiWs.on('error', (err) => {
        console.error('[live-proxy] Gemini WS error:', err.message)
        sendToClient({ type: 'error', message: `Gemini error: ${err.message}` })
      })

      geminiWs.on('close', (code, reasonBuf) => {
        const reason = reasonBuf?.toString() || ''
        console.log('[live-proxy] Gemini WS closed:', code, reason)
        // Surface a meaningful error to the client BEFORE closing the socket.
        // Without this the client just sees `closed` and silently shows "Call ended".
        if (!readySent) {
          // Most common cause: model name unsupported, API key invalid, quota exceeded,
          // or invalid setup payload. Gemini closes the WS with code 1007/1008/1011.
          const msg =
            code === 1008 ? 'Live API rejected the request. Check your API key and model access.'
            : code === 1011 ? 'Live API server error. Try again in a moment.'
            : code === 1007 ? 'Live API rejected the request payload.'
            : reason ? `Live API closed: ${reason}`
            : `Live API closed (code ${code}). Make sure your API key has access to the live model.`
          sendToClient({ type: 'error', message: msg })
        }
        if (clientWs.readyState === WebSocket.OPEN) clientWs.close(1000, reason || 'gemini closed')
      })

      return
    }

    if (!geminiWs || geminiWs.readyState !== WebSocket.OPEN) {
      sendToClient({ type: 'error', message: 'Session not ready — send setup first' })
      return
    }

    // ── Audio chunk ──
    if (msg.type === 'audio') {
      geminiWs.send(JSON.stringify({
        realtimeInput: {
          audio: { data: msg.data, mimeType: 'audio/pcm;rate=16000' },
        },
      }))
      return
    }

    // ── Text turn ──
    // Use clientContent (not realtimeInput.text) so we can mark turnComplete=true
    // and force the model to respond. realtimeInput.text just appends to the
    // input buffer and waits for VAD to commit, which never happens for typed text.
    if (msg.type === 'text') {
      geminiWs.send(JSON.stringify({
        clientContent: {
          turns: [{ role: 'user', parts: [{ text: msg.text }] }],
          turnComplete: true,
        },
      }))
      return
    }

    // ── End turn ──
    if (msg.type === 'end_turn') {
      geminiWs.send(JSON.stringify({
        realtimeInput: { audioStreamEnd: true },
      }))
      return
    }

    // ── Interrupt ──
    // The cleanest way to interrupt the model is to send a clientContent
    // message with turnComplete=true. Per the Live API docs, "A message here
    // will interrupt any current model generation." Sending an empty parts
    // array would be invalid, so we send a single empty-string part which
    // the API tolerates and treats as a turn boundary.
    if (msg.type === 'interrupt') {
      geminiWs.send(JSON.stringify({
        clientContent: {
          turns: [{ role: 'user', parts: [{ text: '' }] }],
          turnComplete: true,
        },
      }))
      return
    }
  })

  clientWs.on('close', () => {
    if (geminiWs && geminiWs.readyState === WebSocket.OPEN) geminiWs.close(1000)
  })

  clientWs.on('error', (err) => {
    console.error('[live-proxy] Client WS error:', err.message)
    if (geminiWs && geminiWs.readyState === WebSocket.OPEN) geminiWs.close(1000)
  })
}

// ─── Gemini message handler ────────────────────────────────────────────────────

function handleGeminiMessage(
  msg: any,
  sendToClient: (m: object) => void,
  onSetupComplete?: () => void,
) {
  // Setup complete — first message back from server confirms session is live
  if (msg?.setupComplete !== undefined) {
    onSetupComplete?.()
    return
  }

  // Error envelope from Gemini (e.g. invalid model, quota exceeded). The Live
  // API doesn't always close on a bad setup — sometimes it emits an `error`
  // body. Surface it so the client doesn't sit at "Connecting…" forever.
  if (msg?.error) {
    const m = msg.error.message || msg.error.status || 'Gemini error'
    sendToClient({ type: 'error', message: m })
    return
  }

  // GoAway = server is about to close. Surface so the client can show a graceful message.
  if (msg?.goAway) {
    return // benign — let the close handler emit the error if needed.
  }

  const sc = msg?.serverContent
  if (!sc) return

  if (sc.interrupted) {
    sendToClient({ type: 'interrupted' })
    return
  }

  if (sc.modelTurn?.parts) {
    for (const part of sc.modelTurn.parts) {
      if (part.inlineData?.data) {
        sendToClient({ type: 'audio', data: part.inlineData.data })
      }
    }
  }

  if (sc.outputTranscription?.text) {
    sendToClient({
      type: 'transcript',
      role: 'model',
      text: sc.outputTranscription.text,
      final: !!sc.outputTranscription.finished,
    })
  }

  if (sc.inputTranscription?.text) {
    sendToClient({
      type: 'transcript',
      role: 'user',
      text: sc.inputTranscription.text,
      final: !!sc.inputTranscription.finished,
    })
  }

  if (sc.turnComplete) {
    sendToClient({ type: 'turn_complete' })
  }
}

// ─── System instruction ────────────────────────────────────────────────────────

function buildLiveSystemInstruction(state: ConversationState, masterPrompt?: string): string {
  const full = getSystemInstruction(state, masterPrompt)
  // Strip JSON format block — Live API responds in natural speech
  const stripped = full
    .replace(/RESPONSE FORMAT[\s\S]*?(?=\n\n[A-Z]|$)/m, '')
    .replace(/Return ONLY valid JSON[\s\S]*?(?=\n\n|$)/m, '')
    .trim()

  return `${stripped}

IMPORTANT — VOICE MODE:
- You are speaking out loud. Respond naturally in spoken language.
- Do NOT output JSON. Speak conversationally.
- Keep responses concise — 2–4 sentences per turn.
- Always end with a question to keep the conversation going.
- Correct errors by recasting naturally in your reply, never by announcing them.`
}
