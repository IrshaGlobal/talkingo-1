/**
 * Session Digest — what the AI produces at session end.
 *
 * This is the bridge between "what happened in the conversation" and
 * "how the LearnerProfile should update." The AI analyzes the transcript
 * and produces this structured output. Then we merge it into the profile.
 *
 * This replaces: SessionRecap + domain deltas + weak pattern updates +
 * character memory updates — all in one clean AI call.
 */

import type { Correction, VocabItem } from '@talkingo/shared/types'
import type {
  LearnerProfile,
  Struggle,
  ActiveWord,
  LastSession,
  MAX_STRUGGLES,
  MAX_ACTIVE_WORDS,
  MAX_GRADUATED_WORDS,
  MAX_ABOUT_USER,
  LEVEL_UP_THRESHOLD,
  LEVEL_DOWN_THRESHOLD,
} from './learner-profile'

// ─── What the AI returns at session end ──────────────────────────────────────

export interface SessionDigest {
  /** Level signal: did they perform above (+1), at (0), or below (-1) their level? */
  levelSignal: -1 | 0 | 1

  /** Struggles observed this session (pattern + example). Max 3 new ones. */
  strugglesObserved: Array<{
    pattern: string
    example: string
    isNew: boolean  // true = not in existing struggles list
  }>

  /** Words the user produced correctly this session (from activeWords list) */
  wordsUsedCorrectly: string[]

  /** New words introduced by the AI this session */
  wordsIntroduced: Array<{
    word: string
    meaning: string
  }>

  /** New facts learned about the user (max 3) */
  newFacts: string[]

  /** Topics discussed this session (max 3) */
  topicsTalkedAbout: string[]

  /** Updated relationship summary (max 150 words) */
  relationshipSummary: string

  /** Brief encouragement for the user (shown in recap UI) */
  encouragement: string

  /** What to focus on next session (shown in recap UI) */
  nextFocus: string
}

// ─── Merge digest into profile ───────────────────────────────────────────────

/**
 * Takes the current profile + session digest and produces the updated profile.
 * This is the ONLY function that mutates the profile. Pure function.
 */
export function mergeDigestIntoProfile(
  profile: LearnerProfile,
  digest: SessionDigest,
  sessionDurationMinutes: number,
  scenarioId: string
): LearnerProfile {
  const now = Date.now()
  const today = new Date().toISOString().split('T')[0]

  // ─── Level logic ────────────────────────────────────────────────────────
  let { level, levelUpSignals, levelDownSignals, sessionsAtLevel } = profile

  if (digest.levelSignal === 1) {
    levelUpSignals += 1
    levelDownSignals = 0 // reset negative streak
  } else if (digest.levelSignal === -1) {
    levelDownSignals += 1
    levelUpSignals = 0 // reset positive streak
  } else {
    // Neutral: don't reset either, but don't advance
  }

  sessionsAtLevel += 1

  // Advance level
  if (levelUpSignals >= 3 && level < 12) {
    level += 1
    levelUpSignals = 0
    levelDownSignals = 0
    sessionsAtLevel = 0
  }

  // Demote level (gentler — needs 3 consecutive negatives)
  if (levelDownSignals >= 3 && level > 1) {
    level -= 1
    levelUpSignals = 0
    levelDownSignals = 0
    sessionsAtLevel = 0
  }

  // ─── Struggles ──────────────────────────────────────────────────────────
  let struggles = [...profile.struggles]
  let totalStrugglesResolved = profile.totalStrugglesResolved

  // Update existing struggles
  for (const obs of digest.strugglesObserved) {
    const existing = struggles.find(s => s.pattern === obs.pattern)
    if (existing) {
      existing.timesTriggered += 1
      existing.lastSeen = today
      existing.improving = false
      // Add example (keep last 3)
      existing.examples = [obs.example, ...existing.examples].slice(0, 3)
    } else if (obs.isNew && struggles.length < 5) {
      // Add new struggle
      struggles.push({
        pattern: obs.pattern,
        examples: [obs.example],
        timesTriggered: 1,
        lastSeen: today,
        improving: false,
      })
    }
  }

  // Mark struggles as improving if not seen this session
  const observedPatterns = new Set(digest.strugglesObserved.map(s => s.pattern))
  for (const struggle of struggles) {
    if (!observedPatterns.has(struggle.pattern)) {
      // Not seen this session — might be improving
      const daysSinceLastSeen = Math.floor(
        (now - new Date(struggle.lastSeen).getTime()) / 86400000
      )
      if (daysSinceLastSeen >= 2 || profile.sessionCount - struggle.timesTriggered >= 2) {
        struggle.improving = true
      }
    }
  }

  // Resolve struggles that have been improving for 3+ sessions
  const resolved = struggles.filter(s => s.improving && s.timesTriggered <= profile.sessionCount - 3)
  struggles = struggles.filter(s => !resolved.includes(s))
  totalStrugglesResolved += resolved.length

  // Cap at 5
  struggles = struggles
    .sort((a, b) => b.timesTriggered - a.timesTriggered)
    .slice(0, 5)

  // ─── Active words ───────────────────────────────────────────────────────
  let activeWords = [...profile.activeWords]
  let graduatedWords = [...profile.graduatedWords]
  let totalWordsGraduated = profile.totalWordsGraduated

  // Update words used correctly
  for (const word of digest.wordsUsedCorrectly) {
    const existing = activeWords.find(w => w.word.toLowerCase() === word.toLowerCase())
    if (existing) {
      existing.usedCorrectly += 1
      existing.met += 1
      // Graduate to solid if used correctly 3+ times
      if (existing.usedCorrectly >= 3) {
        existing.status = 'solid'
      } else if (existing.usedCorrectly >= 1) {
        existing.status = 'shaky'
      }
    }
  }

  // Add new words introduced
  for (const newWord of digest.wordsIntroduced) {
    const alreadyActive = activeWords.some(w => w.word.toLowerCase() === newWord.word.toLowerCase())
    const alreadyGraduated = graduatedWords.some(w => w.toLowerCase() === newWord.word.toLowerCase())
    if (!alreadyActive && !alreadyGraduated) {
      activeWords.push({
        word: newWord.word,
        meaning: newWord.meaning,
        met: 1,
        usedCorrectly: 0,
        status: 'new',
      })
    } else if (alreadyActive) {
      // Bump met count
      const existing = activeWords.find(w => w.word.toLowerCase() === newWord.word.toLowerCase())
      if (existing) existing.met += 1
    }
  }

  // Graduate solid words out
  const newlyGraduated = activeWords.filter(w => w.status === 'solid' && w.usedCorrectly >= 3)
  for (const grad of newlyGraduated) {
    if (!graduatedWords.includes(grad.word)) {
      graduatedWords.push(grad.word)
    }
  }
  activeWords = activeWords.filter(w => !(w.status === 'solid' && w.usedCorrectly >= 3))
  totalWordsGraduated += newlyGraduated.length

  // Cap active words at 30 (drop oldest 'new' ones first)
  if (activeWords.length > 30) {
    activeWords.sort((a, b) => {
      if (a.status === 'new' && b.status !== 'new') return 1
      if (b.status === 'new' && a.status !== 'new') return -1
      return a.met - b.met
    })
    activeWords = activeWords.slice(0, 30)
  }

  // Cap graduated words at 100 (drop oldest)
  graduatedWords = graduatedWords.slice(-100)

  // ─── About user (facts) ─────────────────────────────────────────────────
  let aboutUser = [...profile.aboutUser]
  for (const fact of digest.newFacts) {
    if (fact.trim() && !aboutUser.some(f => f.toLowerCase() === fact.toLowerCase())) {
      aboutUser.push(fact.trim())
    }
  }
  // Cap at 10 (keep most recent)
  aboutUser = aboutUser.slice(-10)

  // ─── Streak ─────────────────────────────────────────────────────────────
  let streak = profile.streak
  if (profile.lastSessionAt) {
    const lastDate = new Date(profile.lastSessionAt)
    lastDate.setHours(0, 0, 0, 0)
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    const daysDiff = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000)
    if (daysDiff === 0) streak = Math.max(1, streak) // same day
    else if (daysDiff === 1) streak += 1 // consecutive day
    else streak = 1 // streak broken
  } else {
    streak = 1
  }

  // ─── Last session ───────────────────────────────────────────────────────
  const lastSession: LastSession = {
    scenarioId,
    topicsTalkedAbout: digest.topicsTalkedAbout.slice(0, 3),
    newStrugglesFound: digest.strugglesObserved.filter(s => s.isNew).map(s => s.pattern),
    wordsIntroduced: digest.wordsIntroduced.map(w => w.word),
    durationMinutes: sessionDurationMinutes,
    date: today,
    engaged: sessionDurationMinutes >= 3, // 3+ minutes = engaged
  }

  // ─── Build updated profile ──────────────────────────────────────────────
  return {
    ...profile,
    level,
    sessionsAtLevel,
    levelUpSignals,
    levelDownSignals,
    struggles,
    activeWords,
    graduatedWords,
    lastSession,
    aboutUser,
    relationshipSummary: digest.relationshipSummary || profile.relationshipSummary,
    sessionCount: profile.sessionCount + 1,
    totalMinutes: profile.totalMinutes + sessionDurationMinutes,
    streak,
    lastSessionAt: now,
    totalWordsGraduated,
    totalStrugglesResolved,
    updatedAt: now,
  }
}
