/**
 * Adapter: LearnerProfile → ConversationState
 *
 * The AI prompt builder in shared/gemini takes a ConversationState.
 * We don't want to rewrite the whole prompt system, so we synthesize a
 * ConversationState from the unified LearnerProfile.
 *
 * This keeps the prompt builder, API routes, and Live server unchanged
 * while making the new profile the single source of truth in the app.
 */

import type {
  ConversationState,
  CefrLevel,
  DomainScores,
  TargetLanguage,
  PersonaId,
} from '@talkingo/shared/types'
import type { LearnerProfile } from './learner-profile'
import { talkingoLevelToCefr } from '@talkingo/shared/levels'

/**
 * Build a ConversationState from a LearnerProfile + scenario context.
 * This is everything the AI needs for one session turn.
 */
export function buildConversationState(
  profile: LearnerProfile,
  scenarioId: string,
  options?: {
    customScenarioPrompt?: string
    plantedPhrase?: { term: string; gloss: string; targetUses: number } | null
    lessonPath?: ConversationState['lessonPath']
  }
): ConversationState {
  // Derive CEFR from talkingo level (used by old prompt code paths)
  const cefr = talkingoLevelToCefr(profile.level) as CefrLevel
  const domainScores: DomainScores = {
    vocabulary: cefr,
    grammar: cefr,
    fluency: cefr,
    listening: cefr,
  }

  // Words to reinforce (shaky words = "review words" for old terminology)
  const reviewWords = profile.activeWords
    .filter(w => w.status === 'shaky')
    .slice(0, 8)
    .map(w => w.word)

  // Mastered/graduated words (for "don't re-teach" prompt block)
  const masteredWords = [
    ...profile.activeWords.filter(w => w.status === 'solid').map(w => w.word),
    ...profile.graduatedWords,
  ].slice(-40)

  // Struggles → weak patterns (string array for old prompt format)
  const weakPatterns = profile.struggles.slice(0, 5).map(s => s.pattern)

  // Character memory block (for "what you remember about them" prompt)
  const characterMemory = profile.aboutUser.length > 0 || profile.relationshipSummary
    ? {
        summary: profile.relationshipSummary || '',
        lastTopics: profile.lastSession?.topicsTalkedAbout ?? [],
        factsToReference: profile.aboutUser.slice(0, 3),
      }
    : null

  // Topic from custom prompt or scenario
  const topic = options?.customScenarioPrompt || scenarioId

  return {
    level: cefrToLanguageLevel(cefr),
    cefr,
    talkingoLevel: profile.level,
    domainScores,
    topic,
    correctionStyle: 'silent', // default — could be a profile preference later
    flowScore: 3,
    persona: profile.persona,
    userName: profile.userName,
    targetLanguage: profile.targetLanguage,
    nativeLanguage: profile.nativeLanguage,
    currentUnitId: scenarioId,
    masteredWords,
    reviewWords,
    weakPatterns,
    sessionNumber: profile.sessionCount + 1,
    plantedPhrase: options?.plantedPhrase ?? null,
    characterMemory,
    lessonPath: options?.lessonPath ?? null,
  }
}

function cefrToLanguageLevel(cefr: CefrLevel): 'beginner' | 'intermediate' | 'advanced' {
  if (cefr === 'A1' || cefr === 'A2') return 'beginner'
  if (cefr === 'B1' || cefr === 'B2') return 'intermediate'
  return 'advanced'
}

/**
 * Build a legacy LanguageProgress shape from the LearnerProfile.
 * Used to keep HomeShell, TopControlBar, and other components working
 * while the new system is the source of truth.
 */
export function progressFromProfile(profile: LearnerProfile | null): import('@talkingo/shared/types').LanguageProgress | null {
  if (!profile) return null
  const cefr = talkingoLevelToCefr(profile.level) as CefrLevel
  const domainScores: DomainScores = {
    vocabulary: cefr,
    grammar: cefr,
    fluency: cefr,
    listening: cefr,
  }
  return {
    targetLanguage: profile.targetLanguage,
    cefr,
    domainScores,
    currentUnitId: profile.lastSession?.scenarioId ?? 'free-talk',
    completedUnits: [],
    completedLessons: [],
    trackedVocab: profile.activeWords.map(w => ({
      term: w.word,
      gloss: w.meaning,
      lastSeenSession: profile.sessionCount,
      timesCorrect: w.usedCorrectly,
      status: w.status === 'solid' ? 'mastered' : w.status === 'shaky' ? 'learning' : 'new',
    })),
    weakPatterns: profile.struggles.map(s => ({
      type: 'grammar' as const,
      category: s.pattern,
      description: s.pattern,
      examples: s.examples,
      frequency: s.timesTriggered,
      severity: s.timesTriggered >= 5 ? 'high' as const : s.timesTriggered >= 3 ? 'medium' as const : 'low' as const,
      lastSeen: s.lastSeen,
    })),
    totalSessions: profile.sessionCount,
    totalMinutes: profile.totalMinutes,
    streakDays: profile.streak,
    lastSessionAt: profile.lastSessionAt ?? undefined,
    sessionsSinceLastAssessment: 0,
  }
}
