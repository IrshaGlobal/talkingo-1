import type {
  Correction,
  GeminiConversationResponse,
  GeminiOpenerResponse,
  GeminiAssessmentResponse,
  VocabItem,
} from '../types'

function tryParseJson(raw: string): any {
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    return JSON.parse(match ? match[0] : raw)
  } catch {
    return null
  }
}

const VALID_TALKINGO_LEVELS: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const VALID_CORRECTION_TYPES = ['grammar', 'vocabulary', 'pronunciation', 'naturalness'] as const

function parseTalkingoLevel(v: unknown, fallback: number = 5): number {
  const n = Number(v)
  return VALID_TALKINGO_LEVELS.includes(n) ? n : fallback
}

const VALID_ROOT_CAUSES = ['careless', 'knowledge-gap', 'l1-interference', 'overgeneralization'] as const

function parseCorrections(raw: unknown, userText?: string): Correction[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((c): c is Record<string, unknown> => !!c && typeof c === 'object')
    .map((c) => ({
      original: String(c.original ?? ''),
      corrected: String(c.corrected ?? ''),
      type: VALID_CORRECTION_TYPES.includes(c.type as any)
        ? (c.type as Correction['type'])
        : 'grammar',
      rootCause: VALID_ROOT_CAUSES.includes(c.rootCause as any)
        ? (c.rootCause as Correction['rootCause'])
        : undefined,
      note: typeof c.note === 'string' ? c.note : undefined,
    }))
    .filter((c) => {
      if (!c.original || !c.corrected) return false
      if (userText && userText.trim().length > 0) {
        const haystack = userText.toLowerCase()
        const needle = c.original.toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      return true
    })
}

export function parseConversationResponse(raw: string, userText?: string): GeminiConversationResponse {
  const parsed = tryParseJson(raw) ?? {}

  let teachingNote: GeminiConversationResponse['teachingNote'] = undefined
  if (parsed.teachingNote && typeof parsed.teachingNote === 'object' && parsed.teachingNote.type && parsed.teachingNote.content) {
    const validTypes = ['correction', 'expression', 'grammar', 'idiom', 'culture']
    if (validTypes.includes(parsed.teachingNote.type)) {
      teachingNote = {
        type: parsed.teachingNote.type,
        title: String(parsed.teachingNote.title || ''),
        content: String(parsed.teachingNote.content || ''),
      }
    }
  }

  return {
    aiResponse: parsed.response || raw || "Sorry, could you say that again?",
    translation: typeof parsed.translation === 'string' ? parsed.translation : undefined,
    corrections: parseCorrections(parsed.corrections, userText),
    vocab: Array.isArray(parsed.vocab) ? (parsed.vocab as VocabItem[]) : [],
    emotion: typeof parsed.emotion === 'string' ? parsed.emotion : 'warm',
    unitComplete: parsed.unitComplete === true,
    domainSignals: undefined,
    teachingNote,
    memoryUpdate: typeof parsed.memoryUpdate === 'string' && parsed.memoryUpdate.trim()
      ? parsed.memoryUpdate.trim()
      : undefined,
  }
}

export function parseOpenerResponse(raw: string): GeminiOpenerResponse {
  const parsed = tryParseJson(raw) ?? {}
  return {
    aiResponse: parsed.response || raw || 'Hi!',
    translation: typeof parsed.translation === 'string' ? parsed.translation : undefined,
    emotion: parsed.emotion || 'warm',
    vocab: Array.isArray(parsed.vocab) ? (parsed.vocab as VocabItem[]) : [],
  }
}

export function parseAssessmentResponse(raw: string): GeminiAssessmentResponse {
  const parsed = tryParseJson(raw) ?? {}
  const talkingoLevel = parseTalkingoLevel(parsed.talkingoLevel, 5)
  return {
    talkingoLevel,
    encouragement: typeof parsed.encouragement === 'string' && parsed.encouragement
      ? parsed.encouragement
      : "Nice start — let's keep going.",
  }
}
