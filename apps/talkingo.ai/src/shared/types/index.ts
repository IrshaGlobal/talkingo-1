// ─── Progress / Session Tracking ──────────────────────────────────────────────

export interface LanguageProgress {
  talkingoLevel: number
  completedLessons?: string[]
  streakDays?: number
  totalSessions?: number
  totalMinutes?: number
}

// ─── Conversation Types ───────────────────────────────────────────────────────

export type CorrectionRootCause = 'careless' | 'knowledge-gap' | 'l1-interference' | 'overgeneralization'

export interface Correction {
  original: string
  corrected: string
  type: 'grammar' | 'vocabulary' | 'pronunciation' | 'naturalness'
  rootCause?: CorrectionRootCause
  note?: string
}

export interface VocabItem {
  term: string
  gloss: string
  romanization?: string
  example?: string
}

export type AudioStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface MessageAudio {
  /** Lifecycle of the TTS request for this message. */
  status: AudioStatus
  /** Base64-encoded audio data returned by /api/gemini/tts. */
  data?: string
  /** Audio format: 'mp3' (Edge TTS) or 'pcm' (Gemini fallback). Default: 'pcm'. */
  format?: 'mp3' | 'pcm'
  /** Sample rate of the PCM data — 24000 by default for Gemini TTS. Ignored for MP3. */
  sampleRate?: number
  /** Total duration in milliseconds, available once decoded. */
  durationMs?: number
  /** Pre-sampled waveform amplitudes (0..1), ~50 buckets. */
  waveform?: number[]
  /** Voice that was used (for replay consistency). */
  voiceName?: string
}

export interface ConversationMessage {
  id: string
  text: string
  isUser: boolean
  corrections?: Correction[]
  vocab?: VocabItem[]
  translation?: string
  emotion?: string
  timestamp?: number
  /** Voice note attached to this message (AI replies in chat modes). */
  audio?: MessageAudio
  /** Teaching card — shown below AI messages when there's something to teach. */
  teachingNote?: TeachingNote | null
}

export type LanguageLevel = 'beginner' | 'intermediate' | 'advanced'
export type CorrectionStyle = 'direct' | 'silent'
export type SkillDomain = 'vocabulary' | 'grammar' | 'fluency' | 'listening'
export type ScriptPreference = 'native' | 'latin' | 'both'
export type LearnerGender = 'masculine' | 'feminine'

export type ConversationTopic =
  | 'food' | 'travel' | 'music' | 'sports' | 'work' | 'culture' | 'general'

export type LearningGoal = 'travel' | 'career' | 'daily-life' | 'academic' | 'cultural'

export type TargetLanguage =
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'nl' | 'pl' | 'ro' | 'ru' | 'uk'
  | 'ja' | 'ko' | 'zh' | 'hi' | 'bn' | 'id' | 'mr' | 'ta' | 'te' | 'th' | 'vi'
  | 'ar' | 'tr'

export const LANGUAGE_NAMES: Record<TargetLanguage, string> = {
  en: 'English (US)', es: 'Spanish (Spain)', fr: 'French (France)',
  de: 'German (Germany)', it: 'Italian (Italy)', nl: 'Dutch (Netherlands)',
  pl: 'Polish (Poland)', ro: 'Romanian (Romania)', ru: 'Russian (Russia)',
  uk: 'Ukrainian (Ukraine)', ja: 'Japanese (Japan)', ko: 'Korean (South Korea)',
  zh: 'Mandarin Chinese (China & Taiwan)', hi: 'Hindi (India)',
  bn: 'Bengali (Bangladesh)', id: 'Indonesian (Indonesia)', mr: 'Marathi (India)',
  ta: 'Tamil (India)', te: 'Telugu (India)', th: 'Thai (Thailand)',
  vi: 'Vietnamese (Vietnam)', ar: 'Arabic (Egypt)', tr: 'Turkish (Turkey)',
}

export type PersonaId = 'eli' | 'alex' | 'dr-luma' | 'sofia' | 'riko' | 'marco'

export type PersonaRegister = 'casual' | 'mixed' | 'formal'


export interface AIPersona {
  id: PersonaId
  name: string
  description: string
  personality: string
  conversationStyle: string
  gender: 'male' | 'female'
  voiceName: string
}

/**
 * A single vocabulary item tracked in the spaced repetition system.
 */


// ─── Conversation State ───────────────────────────────────────────────────────

export interface ConversationState {
  /** Talkingo 12-level system (1-12). */
  talkingoLevel: number
  topic: ConversationTopic | string
  correctionStyle: CorrectionStyle
  persona?: PersonaId
  userName?: string
  targetLanguage?: TargetLanguage
  nativeLanguage?: TargetLanguage | string
  learningGoal?: LearningGoal
  currentUnitId?: string
  /** Custom scenario prompt typed by the user (from TalkScreen custom input). */
  customPrompt?: string
  /** Cross-session AI memory paragraph — injected into every system prompt. */
  memoryLifeline?: string
  /** User-written notes for the AI — injected into every system prompt. */
  userNotes?: string
}

export interface UserPreferences {
  talkingoLevel?: number
  level?: LanguageLevel
  topic: ConversationTopic | string
  correctionStyle: CorrectionStyle
  persona?: PersonaId
  userName?: string
  targetLanguage?: TargetLanguage
  nativeLanguage?: TargetLanguage | string
  learningGoal?: LearningGoal
  onboardingComplete?: boolean
  currentUnitId?: string
  preferredScript?: ScriptPreference
  learnerGender?: LearnerGender
}

// ─── Progress / Session Tracking ──────────────────────────────────────────────

/**
 * Structured weak pattern with type safety.
 * Replaces the old string[] approach for better AI guidance and UI display.
 */


// ─── Character Memory (story continuity) ─────────────────────────────────────

/**
 * Per-character rolling memory. One row per (user × persona × language).
 * Updated after every session. Used to open future sessions with personal
 * references ("How did the interview go?").
 */


// ─── Gemini Response Types ────────────────────────────────────────────────────

export interface TeachingNote {
  type: 'correction' | 'expression' | 'grammar' | 'idiom' | 'culture'
  title: string
  content: string
}

export interface GeminiConversationResponse {
  aiResponse: string
  translation?: string
  corrections: Correction[]
  vocab?: VocabItem[]
  emotion: string
  unitComplete?: boolean
  domainSignals?: Partial<Record<SkillDomain, 'up' | 'same' | 'down'>>
  teachingNote?: TeachingNote | null
  /** Cross-session memory: single-paragraph summary of what the AI knows about the user. */
  memoryUpdate?: string
}

export interface GeminiOpenerResponse {
  aiResponse: string
  translation?: string
  emotion: string
  vocab?: VocabItem[]
}

export interface GeminiAssessmentResponse {
  talkingoLevel: number
  encouragement: string
}


// ─── User / Auth Types ────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  email: string
  displayName?: string
  preferences?: UserPreferences
  createdAt: string
}

export type SubscriptionPlan = 'free' | 'pro'
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due'

export interface Subscription {
  userId: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  renewsAt?: string
}
