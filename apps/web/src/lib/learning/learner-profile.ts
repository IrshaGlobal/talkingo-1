/**
 * LearnerProfile — The single source of truth for a user's learning state.
 *
 * DESIGN PHILOSOPHY:
 * - One object, one Appwrite document, one localStorage cache
 * - Everything the AI needs to teach well lives here
 * - Everything the system needs to decide "what's next" lives here
 * - Capped, focused, actionable — not a data warehouse
 *
 * STORAGE:
 * - Appwrite: `learner_profiles` collection (1 doc per user×language)
 * - localStorage: `talkingo_profile_{userId}_{lang}` (instant load cache)
 * - Written ONCE at session end. Read ONCE at session start.
 */

import type { PersonaId, TargetLanguage } from '@talkingo/shared/types'

// ─── Core Types ──────────────────────────────────────────────────────────────

/**
 * A specific thing the user keeps getting wrong.
 * Max 5 active at a time. When one resolves, a new one can enter.
 */
export interface Struggle {
  /** Short label: "article usage", "ser vs estar", "past tense questions" */
  pattern: string
  /** Last 3 actual mistakes the user made (for AI context) */
  examples: string[]
  /** How many sessions this has appeared in */
  timesTriggered: number
  /** When it last appeared */
  lastSeen: string
  /** Is the frequency decreasing? (not seen in last 2 sessions = improving) */
  improving: boolean
}

/**
 * A word/phrase the user is actively learning.
 * Max 30 at a time. Graduates out when solid, new ones enter.
 */
export interface ActiveWord {
  /** The word/phrase in target language */
  word: string
  /** English meaning */
  meaning: string
  /** How many times the user has encountered it (AI used it or user saw it) */
  met: number
  /** How many times the user produced it correctly in their own speech */
  usedCorrectly: number
  /** Simple status: new (just introduced), shaky (seen but not reliable), solid (can use freely) */
  status: 'new' | 'shaky' | 'solid'
}

/**
 * What happened last session — used for continuity and "what's next" logic.
 */
export interface LastSession {
  scenarioId: string
  topicsTalkedAbout: string[]
  newStrugglesFound: string[]
  wordsIntroduced: string[]
  durationMinutes: number
  date: string
  /** Did the user seem engaged? (based on message count vs duration) */
  engaged: boolean
}

/**
 * The complete learner profile. One per user×language.
 */
export interface LearnerProfile {
  // ─── Identity ───────────────────────────────────────────────────────────
  userId: string
  targetLanguage: TargetLanguage
  nativeLanguage: string
  persona: PersonaId
  userName?: string

  // ─── Level (single number 1-12) ─────────────────────────────────────────
  level: number
  /** How many sessions at current level (used for advancement logic) */
  sessionsAtLevel: number
  /** Consecutive sessions with positive signal → advance */
  levelUpSignals: number
  /** Consecutive sessions with negative signal → consider demotion */
  levelDownSignals: number

  // ─── What they struggle with (max 5 active) ────────────────────────────
  struggles: Struggle[]

  // ─── Words in progress (max 30 active) ──────────────────────────────────
  activeWords: ActiveWord[]
  /** Words that graduated to "solid" — kept for reference, not re-taught (max 100) */
  graduatedWords: string[]

  // ─── Session memory ─────────────────────────────────────────────────────
  lastSession: LastSession | null

  // ─── Relationship (what the AI "remembers") ─────────────────────────────
  /** Facts about the user the AI can reference (max 10) */
  aboutUser: string[]
  /** Rolling summary of the learning relationship (max 150 words) */
  relationshipSummary: string

  // ─── Stats ──────────────────────────────────────────────────────────────
  sessionCount: number
  totalMinutes: number
  streak: number
  lastSessionAt: number | null
  /** Total words graduated (lifetime achievement) */
  totalWordsGraduated: number
  /** Total struggles resolved (lifetime achievement) */
  totalStrugglesResolved: number

  // ─── Metadata ───────────────────────────────────────────────────────────
  createdAt: number
  updatedAt: number
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export function createEmptyProfile(
  userId: string,
  targetLanguage: TargetLanguage,
  nativeLanguage: string,
  persona: PersonaId,
  level: number = 1,
  userName?: string
): LearnerProfile {
  return {
    userId,
    targetLanguage,
    nativeLanguage,
    persona,
    userName,
    level,
    sessionsAtLevel: 0,
    levelUpSignals: 0,
    levelDownSignals: 0,
    struggles: [],
    activeWords: [],
    graduatedWords: [],
    lastSession: null,
    aboutUser: [],
    relationshipSummary: '',
    sessionCount: 0,
    totalMinutes: 0,
    streak: 0,
    lastSessionAt: null,
    totalWordsGraduated: 0,
    totalStrugglesResolved: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAX_STRUGGLES = 5
export const MAX_ACTIVE_WORDS = 30
export const MAX_GRADUATED_WORDS = 100
export const MAX_ABOUT_USER = 10
export const LEVEL_UP_THRESHOLD = 3    // 3 consecutive positive sessions → advance
export const LEVEL_DOWN_THRESHOLD = 3  // 3 consecutive negative sessions → demote
