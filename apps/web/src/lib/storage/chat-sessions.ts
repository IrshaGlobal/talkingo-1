/**
 * Unified Chat Sessions — single source of truth for all conversation history.
 *
 * DESIGN:
 * - Auto-saves on every message (debounced 500ms)
 * - A session is created the moment the first message arrives
 * - Keeps last 30 sessions per user
 * - In call/live modes: saves transcription only (no audio blobs)
 * - In chat/handsfree modes: saves full messages including voice note audio
 * - Sessions persist across page refresh, tab close, accidental navigation
 * - No manual "save" step needed — it just works like any chat app
 *
 * STORAGE: localStorage only (device-bound). ~5-50KB per session.
 */

import type { ConversationMessage, PersonaId, TargetLanguage, Correction } from '@talkingo/shared/types'

// ─── Types ───────────────────────────────────────────────────────────────────

export type SessionMode = 'manual' | 'handsfree' | 'callonly' | 'live'
export type SessionStatus = 'active' | 'ended'

export interface ChatSession {
  /** Unique session ID (timestamp-based) */
  id: string
  /** When the session started */
  startedAt: number
  /** When the session was last updated (last message or end) */
  updatedAt: number
  /** Session duration in seconds (updated live) */
  durationSeconds: number
  /** Current status */
  status: SessionStatus
  /** Conversation mode used */
  mode: SessionMode
  /** Persona used in this session */
  personaId: PersonaId
  /** Target language */
  targetLanguage: string
  /** Session title (scenario name, lesson title, or "Free Talk") */
  title: string
  /** CEFR level at time of session */
  level: string
  /** Topic/scenario ID */
  scenarioId: string
  /** All messages in the session */
  messages: ConversationMessage[]
  /** Total corrections across all messages */
  totalCorrections: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_SESSIONS = 30
const STORAGE_KEY_PREFIX = 'talkingo_sessions_'
const ACTIVE_SESSION_KEY = 'talkingo_active_session'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function storageKey(userId: string | null): string {
  return `${STORAGE_KEY_PREFIX}${userId || 'anon'}`
}

function activeSessionKey(userId: string | null): string {
  return `${ACTIVE_SESSION_KEY}_${userId || 'anon'}`
}

/**
 * Strip audio blobs from messages for call/live modes (transcription only).
 * For chat/handsfree modes, keep audio data intact.
 */
function prepareMessagesForStorage(messages: ConversationMessage[], mode: SessionMode): ConversationMessage[] {
  const isCallMode = mode === 'callonly' || mode === 'live'

  return messages.map((m) => {
    if (isCallMode && m.audio) {
      // In call modes, strip audio — only keep transcription
      const { audio: _audio, ...rest } = m
      return rest
    }
    // In chat/handsfree modes, keep everything including audio
    return m
  })
}

// ─── Core API ────────────────────────────────────────────────────────────────

/**
 * Create a new session. Called when a conversation starts (first message arrives).
 * Returns the session ID.
 */
export function createSession(
  userId: string | null,
  opts: {
    mode: SessionMode
    personaId: PersonaId
    targetLanguage: string
    title: string
    level: string
    scenarioId: string
  }
): string {
  const id = Date.now().toString()

  const session: ChatSession = {
    id,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    durationSeconds: 0,
    status: 'active',
    mode: opts.mode,
    personaId: opts.personaId,
    targetLanguage: opts.targetLanguage,
    title: opts.title,
    level: opts.level,
    scenarioId: opts.scenarioId,
    messages: [],
    totalCorrections: 0,
  }

  // Save as active session for crash recovery
  try {
    localStorage.setItem(activeSessionKey(userId), JSON.stringify(session))
  } catch {
    // ignore quota errors
  }

  // Also add to the sessions list immediately
  _addSessionToList(userId, session)

  return id
}

/**
 * Update the active session with new messages. Called on every message change.
 * This is the auto-save — no manual trigger needed.
 */
export function updateSession(
  userId: string | null,
  sessionId: string,
  messages: ConversationMessage[],
  mode: SessionMode,
  durationSeconds: number
): void {
  try {
    const sessions = loadAllSessions(userId)
    const idx = sessions.findIndex((s) => s.id === sessionId)
    if (idx === -1) return

    const prepared = prepareMessagesForStorage(messages, mode)
    const totalCorrections = prepared.reduce(
      (sum, m) => sum + (m.corrections?.length || 0),
      0
    )

    sessions[idx] = {
      ...sessions[idx],
      messages: prepared,
      updatedAt: Date.now(),
      durationSeconds,
      totalCorrections,
    }

    localStorage.setItem(storageKey(userId), JSON.stringify(sessions))

    // Also update active session marker
    localStorage.setItem(activeSessionKey(userId), JSON.stringify(sessions[idx]))
  } catch {
    // ignore quota errors — better to lose recent messages than crash
  }
}

/**
 * Mark a session as ended. Called when the user ends the call/chat.
 */
export function endSession(
  userId: string | null,
  sessionId: string,
  finalDuration: number
): void {
  try {
    const sessions = loadAllSessions(userId)
    const idx = sessions.findIndex((s) => s.id === sessionId)
    if (idx === -1) return

    sessions[idx] = {
      ...sessions[idx],
      status: 'ended',
      durationSeconds: finalDuration,
      updatedAt: Date.now(),
    }

    localStorage.setItem(storageKey(userId), JSON.stringify(sessions))

    // Clear active session marker
    localStorage.removeItem(activeSessionKey(userId))
  } catch {
    // ignore
  }
}

/**
 * Load all sessions for a user (most recent first). This is what the history page reads.
 */
export function loadAllSessions(userId: string | null): ChatSession[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Load a specific session by ID.
 */
export function getSessionById(userId: string | null, sessionId: string): ChatSession | null {
  const sessions = loadAllSessions(userId)
  return sessions.find((s) => s.id === sessionId) || null
}

/**
 * Delete a session by ID.
 */
export function deleteSession(userId: string | null, sessionId: string): boolean {
  try {
    const sessions = loadAllSessions(userId)
    const filtered = sessions.filter((s) => s.id !== sessionId)
    localStorage.setItem(storageKey(userId), JSON.stringify(filtered))
    return true
  } catch {
    return false
  }
}

/**
 * Clear all sessions for a user.
 */
export function clearAllSessions(userId: string | null): void {
  try {
    localStorage.removeItem(storageKey(userId))
    localStorage.removeItem(activeSessionKey(userId))
  } catch {
    // ignore
  }
}

/**
 * Get the active (in-progress) session if any. Used for crash recovery.
 */
export function getActiveSession(userId: string | null): ChatSession | null {
  try {
    const raw = localStorage.getItem(activeSessionKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as ChatSession
  } catch {
    return null
  }
}

/**
 * Recover an active session that was interrupted (page refresh, crash).
 * Marks it as ended and ensures it's in the sessions list.
 */
export function recoverActiveSession(userId: string | null): ChatSession | null {
  const active = getActiveSession(userId)
  if (!active || active.messages.length === 0) {
    // Nothing to recover — clear the marker
    try { localStorage.removeItem(activeSessionKey(userId)) } catch {}
    return null
  }

  // Mark as ended
  active.status = 'ended'
  active.updatedAt = Date.now()

  // Ensure it's in the sessions list
  const sessions = loadAllSessions(userId)
  const exists = sessions.some((s) => s.id === active.id)
  if (!exists) {
    _addSessionToList(userId, active)
  } else {
    // Update the existing entry
    const idx = sessions.findIndex((s) => s.id === active.id)
    if (idx !== -1) {
      sessions[idx] = active
      try { localStorage.setItem(storageKey(userId), JSON.stringify(sessions)) } catch {}
    }
  }

  // Clear active marker
  try { localStorage.removeItem(activeSessionKey(userId)) } catch {}

  return active
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function _addSessionToList(userId: string | null, session: ChatSession): void {
  try {
    const sessions = loadAllSessions(userId)
    // Add to front (most recent first), cap at MAX_SESSIONS
    const updated = [session, ...sessions.filter((s) => s.id !== session.id)].slice(0, MAX_SESSIONS)
    localStorage.setItem(storageKey(userId), JSON.stringify(updated))
  } catch {
    // ignore quota errors
  }
}

// ─── Formatting helpers ──────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Get a human-readable mode label.
 */
export function modeLabel(mode: SessionMode): string {
  switch (mode) {
    case 'manual': return 'Chat'
    case 'handsfree': return 'Hands-free'
    case 'callonly': return 'Call'
    case 'live': return 'Live Call'
  }
}
