/**
 * Migration: Convert existing scattered data into a unified LearnerProfile.
 *
 * Reads from:
 * - language_progress (CEFR scores, tracked vocab, weak patterns, streak, stats)
 * - character_memory (summary, facts, topics)
 * - conversation_memory (last scenario, topics, user facts)
 * - user_preferences (persona, languages, level)
 *
 * Produces: one LearnerProfile object.
 *
 * This runs ONCE per user on first load after the new system is deployed.
 * After migration, the old data stays (no deletion) but is no longer read.
 */

import type { TargetLanguage, PersonaId, CefrLevel } from '@talkingo/shared/types'
import type { LearnerProfile, Struggle, ActiveWord } from './learner-profile'
import { createEmptyProfile } from './learner-profile'
import { cefrToTalkingoLevel } from '@talkingo/shared/levels'

interface OldProgressData {
  cefr?: CefrLevel
  domainScores?: Record<string, CefrLevel>
  trackedVocab?: Array<{
    term: string
    gloss: string
    lastSeenSession: number
    timesCorrect: number
    status: 'new' | 'learning' | 'mastered' | 'forgotten'
  }>
  weakPatterns?: Array<{
    type: string
    category: string
    description: string
    examples: string[]
    frequency: number
    severity: string
    lastSeen: string
  } | string>
  totalSessions?: number
  totalMinutes?: number
  streakDays?: number
  lastSessionAt?: number
  completedUnits?: string[]
}

interface OldCharacterMemory {
  summary?: string
  facts?: Array<{ fact: string; sessionNumber: number }>
  lastTopics?: string[]
  sessionsCount?: number
}

interface OldConversationMemory {
  lastScenarioId?: string
  lastTopics?: string[]
  userFacts?: string[]
  conversationSummary?: string
  totalSessions?: number
  lastSessionAt?: number
}

/**
 * Build a LearnerProfile from existing scattered data.
 * Returns null if there's nothing to migrate (new user).
 */
export function migrateToProfile(
  userId: string,
  targetLanguage: TargetLanguage,
  nativeLanguage: string,
  persona: PersonaId,
  userName: string | undefined,
  oldProgress: OldProgressData | null,
  oldCharacterMemory: OldCharacterMemory | null,
  oldConversationMemory: OldConversationMemory | null
): LearnerProfile | null {
  // If no progress data exists, this is a fresh user — no migration needed
  if (!oldProgress && !oldCharacterMemory && !oldConversationMemory) {
    return null
  }

  // Start with empty profile
  const profile = createEmptyProfile(userId, targetLanguage, nativeLanguage, persona, 1, userName)

  // ─── Level (from CEFR) ──────────────────────────────────────────────────
  if (oldProgress?.cefr) {
    profile.level = cefrToTalkingoLevel(oldProgress.cefr)
  } else if (oldProgress?.domainScores) {
    // Average domain scores
    const scores = Object.values(oldProgress.domainScores)
    const avgIndex = scores.reduce((sum, cefr) => sum + cefrToTalkingoLevel(cefr), 0) / scores.length
    profile.level = Math.round(avgIndex)
  }

  // ─── Struggles (from weak patterns) ─────────────────────────────────────
  if (oldProgress?.weakPatterns) {
    for (const wp of oldProgress.weakPatterns) {
      if (typeof wp === 'string') {
        profile.struggles.push({
          pattern: wp,
          examples: [],
          timesTriggered: 1,
          lastSeen: new Date().toISOString().split('T')[0],
          improving: false,
        })
      } else {
        profile.struggles.push({
          pattern: wp.description || wp.category,
          examples: wp.examples?.slice(0, 3) || [],
          timesTriggered: wp.frequency || 1,
          lastSeen: wp.lastSeen || new Date().toISOString().split('T')[0],
          improving: false,
        })
      }
    }
    // Cap at 5, sorted by frequency
    profile.struggles = profile.struggles
      .sort((a, b) => b.timesTriggered - a.timesTriggered)
      .slice(0, 5)
  }

  // ─── Active words (from tracked vocab) ──────────────────────────────────
  if (oldProgress?.trackedVocab) {
    // Take non-mastered words as active, mastered as graduated
    for (const v of oldProgress.trackedVocab) {
      if (v.status === 'mastered') {
        profile.graduatedWords.push(v.term)
      } else if (v.status !== 'forgotten') {
        profile.activeWords.push({
          word: v.term,
          meaning: v.gloss,
          met: v.lastSeenSession || 1,
          usedCorrectly: v.timesCorrect || 0,
          status: v.status === 'learning' ? 'shaky' : 'new',
        })
      }
    }
    // Cap
    profile.activeWords = profile.activeWords.slice(0, 30)
    profile.graduatedWords = profile.graduatedWords.slice(-100)
    profile.totalWordsGraduated = profile.graduatedWords.length
  }

  // ─── About user (from character memory + conversation memory) ───────────
  const facts: string[] = []
  if (oldCharacterMemory?.facts) {
    for (const f of oldCharacterMemory.facts) {
      if (f.fact && !facts.includes(f.fact)) facts.push(f.fact)
    }
  }
  if (oldConversationMemory?.userFacts) {
    for (const f of oldConversationMemory.userFacts) {
      if (f && !facts.includes(f)) facts.push(f)
    }
  }
  profile.aboutUser = facts.slice(0, 10)

  // ─── Relationship summary ──────────────────────────────────────────────
  profile.relationshipSummary = oldCharacterMemory?.summary
    || oldConversationMemory?.conversationSummary
    || ''

  // ─── Last session ──────────────────────────────────────────────────────
  if (oldConversationMemory?.lastScenarioId) {
    profile.lastSession = {
      scenarioId: oldConversationMemory.lastScenarioId,
      topicsTalkedAbout: oldConversationMemory.lastTopics || [],
      newStrugglesFound: [],
      wordsIntroduced: [],
      durationMinutes: 0,
      date: oldConversationMemory.lastSessionAt
        ? new Date(oldConversationMemory.lastSessionAt).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      engaged: true,
    }
  }

  // ─── Stats ─────────────────────────────────────────────────────────────
  profile.sessionCount = oldProgress?.totalSessions ?? oldConversationMemory?.totalSessions ?? 0
  profile.totalMinutes = oldProgress?.totalMinutes ?? 0
  profile.streak = oldProgress?.streakDays ?? 0
  profile.lastSessionAt = oldProgress?.lastSessionAt ?? oldConversationMemory?.lastSessionAt ?? null

  profile.updatedAt = Date.now()

  return profile
}

/**
 * Check if a user needs migration (has old data but no new profile).
 */
export function needsMigration(
  userId: string | null,
  targetLanguage: TargetLanguage
): boolean {
  if (!userId) return false
  // Check if new profile exists in localStorage
  const key = `talkingo_profile_${userId}_${targetLanguage}`
  const existing = localStorage.getItem(key)
  if (existing) return false // already migrated

  // Check if old data exists
  const oldProgressKey = `talkingo_progress_${userId}_${targetLanguage}`
  const oldProgress = localStorage.getItem(oldProgressKey)
  return !!oldProgress
}
