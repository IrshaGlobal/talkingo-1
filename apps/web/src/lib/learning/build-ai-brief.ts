/**
 * Build AI Brief — the single, clear instruction set for the AI each session.
 *
 * Replaces the 15-block prompt builder with one focused brief.
 * The AI gets: who it is, who the user is, what to focus on, and how to behave.
 *
 * Total prompt size: ~800-1200 tokens (down from ~2000+).
 */

import type { LearnerProfile } from './learner-profile'
import type { TargetLanguage } from '@talkingo/shared/types'
import { getPersonaById, getPersonaPrompt } from '@talkingo/shared/gemini/personas'
import { getLanguageMeta } from '@talkingo/shared/languages'
import { getLevelByNumber } from '@talkingo/shared/levels'
import { getSeedById, type ConversationSeed } from '@talkingo/shared/curriculum'
import { MASTER_PROMPT } from '@talkingo/shared/gemini/master-prompt'
import { buildL1PromptBlock } from '@talkingo/shared/curriculum/l1-interference'

// ─── Response format (kept from current system — it works) ───────────────────

const RESPONSE_FORMAT = `═══ RESPONSE FORMAT ═══

Return ONLY valid JSON (no markdown, no code fences):
{
  "response": "Your reply IN THE TARGET LANGUAGE.",
  "corrections": [{"original":"wrong","corrected":"right","type":"grammar|vocabulary|pronunciation|naturalness","note":"max 15 words"}],
  "vocab": [{"term":"new word/phrase","gloss":"English meaning"}],
  "teachingNote": {"type":"correction|expression|grammar|idiom|culture","title":"short title","content":"the teaching point"} | null
}

Field rules:
- "response": ALWAYS in the target language.
- "corrections": ONLY errors from the user's CURRENT message. Empty array if none.
- "vocab": words YOU introduced this turn that are NEW to the user. Empty array if none.
- "teachingNote": ONE teaching card. Only when genuinely useful. null otherwise.`

// ─── The brief builder ───────────────────────────────────────────────────────

export function buildSessionBrief(
  profile: LearnerProfile,
  scenarioId: string,
  options?: {
    /** Custom scenario prompt (user-typed) */
    customPrompt?: string
  }
): string {
  const persona = getPersonaById(profile.persona)
  const lang = getLanguageMeta(profile.targetLanguage)
  const levelData = getLevelByNumber(profile.level)
  const seed = getSeedForScenario(scenarioId, options?.customPrompt)

  const blocks: string[] = []

  // 1. Master prompt (core identity + teaching principles)
  blocks.push(MASTER_PROMPT)

  // 2. Response format
  blocks.push(RESPONSE_FORMAT)

  // 3. Language
  blocks.push(buildLanguageBlock(lang))

  // 4. Level behavior (from the 12-level system)
  blocks.push(levelData.aiBehavior)

  // 5. Session focus — THE KEY BLOCK
  blocks.push(buildFocusBlock(profile, seed))

  // 6. What you know about them
  if (profile.aboutUser.length > 0 || profile.relationshipSummary) {
    blocks.push(buildMemoryBlock(profile))
  }

  // 7. Scenario
  if (seed) {
    blocks.push(buildScenarioBlock(seed))
  }

  // 8. Persona
  if (persona) {
    blocks.push(getPersonaPrompt(persona))
  }

  // 9. L1 interference awareness
  const l1Block = buildL1PromptBlock(profile.nativeLanguage)
  if (l1Block) blocks.push(l1Block)

  return blocks.filter(Boolean).join('\n\n')
}

// ─── Block builders ──────────────────────────────────────────────────────────

function buildLanguageBlock(lang: ReturnType<typeof getLanguageMeta>): string {
  const scriptHint = lang.script === 'non-latin'
    ? `${lang.english} uses a non-Latin script. Always write "response" in the native script.`
    : `${lang.english} uses Latin script.`
  return `TARGET LANGUAGE: ${lang.english} (${lang.native})
${scriptHint}
Write EVERYTHING in "response" in ${lang.english}. Never default to English.`
}

function buildFocusBlock(profile: LearnerProfile, seed: ConversationSeed | null): string {
  const parts: string[] = ['═══ SESSION FOCUS ═══']

  // Struggles to target
  if (profile.struggles.length > 0) {
    const top = profile.struggles.slice(0, 3)
    parts.push(`THEY KEEP STRUGGLING WITH:`)
    for (const s of top) {
      const example = s.examples[0] ? ` (e.g., "${s.examples[0]}")` : ''
      parts.push(`- ${s.pattern}${example} [seen ${s.timesTriggered}x]`)
    }
    parts.push(`→ Create situations that require these patterns. Correct when they appear.`)
  }

  // Words to reinforce
  const shakyWords = profile.activeWords
    .filter(w => w.status === 'shaky')
    .slice(0, 5)
  const newWords = profile.activeWords
    .filter(w => w.status === 'new')
    .slice(0, 3)

  if (shakyWords.length > 0) {
    parts.push(`\nWORDS TO REINFORCE (use naturally, notice if they produce them):`)
    parts.push(shakyWords.map(w => `- ${w.word} (${w.meaning})`).join('\n'))
  }

  if (newWords.length > 0) {
    parts.push(`\nRECENT WORDS (introduced but not yet used by user):`)
    parts.push(newWords.map(w => `- ${w.word} (${w.meaning})`).join('\n'))
  }

  // New words to introduce (from scenario vocab, excluding known)
  if (seed && seed.targetVocab.length > 0) {
    const known = new Set([
      ...profile.activeWords.map(w => w.word.toLowerCase()),
      ...profile.graduatedWords.map(w => w.toLowerCase()),
    ])
    const newVocab = seed.targetVocab.filter(v => !known.has(v.toLowerCase())).slice(0, 2)
    if (newVocab.length > 0) {
      parts.push(`\nNEW WORDS TO INTRODUCE THIS SESSION (max 2, weave in naturally):`)
      parts.push(newVocab.map(v => `- ${v}`).join('\n'))
    }
  }

  // Graduated words (don't re-teach)
  if (profile.graduatedWords.length > 0) {
    const recent = profile.graduatedWords.slice(-20)
    parts.push(`\nWORDS THEY ALREADY KNOW (don't re-teach): ${recent.join(', ')}`)
  }

  return parts.join('\n')
}

function buildMemoryBlock(profile: LearnerProfile): string {
  const parts: string[] = ['═══ WHAT YOU KNOW ABOUT THEM ═══']

  if (profile.aboutUser.length > 0) {
    parts.push(profile.aboutUser.map(f => `- ${f}`).join('\n'))
  }

  if (profile.lastSession) {
    const ls = profile.lastSession
    if (ls.topicsTalkedAbout.length > 0) {
      parts.push(`Last time you talked about: ${ls.topicsTalkedAbout.join(', ')}`)
    }
  }

  if (profile.relationshipSummary) {
    parts.push(`\nRelationship context: ${profile.relationshipSummary}`)
  }

  parts.push(`\nSession #${profile.sessionCount + 1}. They've been practicing for ${profile.totalMinutes} minutes total.`)
  if (profile.streak > 1) {
    parts.push(`They're on a ${profile.streak}-day streak. Acknowledge it briefly if natural.`)
  }

  parts.push(`\nWhen opening, you MAY reference one fact naturally. Don't dump all of them.`)

  return parts.join('\n')
}

function buildScenarioBlock(seed: ConversationSeed): string {
  return `═══ SCENARIO ═══
"${seed.title}"
${seed.scenarioBrief}
Use this as loose context, not a rigid script. Let the conversation flow naturally.`
}

function getSeedForScenario(scenarioId: string, customPrompt?: string): ConversationSeed | null {
  if (!scenarioId || scenarioId === 'free-talk') return null

  if (scenarioId.startsWith('custom-') && customPrompt) {
    return {
      id: scenarioId,
      title: customPrompt.slice(0, 50),
      blurb: 'User-defined scenario',
      cefrRange: ['A2', 'B1'],
      prerequisites: [],
      domains: ['fluency'],
      scenarioBrief: `Have a natural conversation about: ${customPrompt}`,
      targetGrammar: [],
      targetVocab: [],
      successCue: 'User engages meaningfully.',
    }
  }

  return getSeedById(scenarioId) || null
}

// ─── Opener prompt ───────────────────────────────────────────────────────────

export function buildOpenerPrompt(profile: LearnerProfile, scenarioId: string): string {
  const lang = getLanguageMeta(profile.targetLanguage)
  const seed = getSeedForScenario(scenarioId)
  const scenarioInfo = seed ? `Scenario: "${seed.title}"` : 'Mode: Free conversation'

  return `Open a fresh session. The user just arrived.

Context:
- Language: ${lang.english}
- ${scenarioInfo}
${profile.userName ? `- Their name: ${profile.userName}` : ''}
- Session #${profile.sessionCount + 1}

Open IN THE TARGET LANGUAGE. Be warm, natural, and end with something that makes them want to respond. Return JSON.`
}

// ─── Session digest prompt (asked at session end) ────────────────────────────

export function buildDigestPrompt(
  profile: LearnerProfile,
  transcript: Array<{ role: 'user' | 'ai'; text: string }>,
  corrections: Array<{ original: string; corrected: string; type: string; note?: string }>,
  vocabIntroduced: Array<{ term: string; gloss: string }>,
  durationMinutes: number
): string {
  const transcriptStr = transcript
    .map(t => `${t.role === 'user' ? 'USER' : 'AI'}: ${t.text}`)
    .join('\n')

  const existingStruggles = profile.struggles.map(s => s.pattern)
  const activeWordsList = profile.activeWords.map(w => w.word)

  return `Analyze this conversation and produce a session digest.

USER'S CURRENT PROFILE:
- Level: ${profile.level}/12
- Known struggles: ${existingStruggles.length > 0 ? existingStruggles.join(', ') : 'none yet'}
- Active words being learned: ${activeWordsList.length > 0 ? activeWordsList.join(', ') : 'none yet'}
- Known facts: ${profile.aboutUser.length > 0 ? profile.aboutUser.join('; ') : 'none yet'}

TRANSCRIPT (${durationMinutes} minutes):
${transcriptStr}

CORRECTIONS LOGGED:
${corrections.length > 0 ? JSON.stringify(corrections, null, 1) : 'None'}

VOCAB INTRODUCED BY AI:
${vocabIntroduced.length > 0 ? vocabIntroduced.map(v => `${v.term} (${v.gloss})`).join(', ') : 'None'}

Return ONLY this JSON:
{
  "levelSignal": -1 | 0 | 1,
  "strugglesObserved": [{"pattern": "short label", "example": "what they said wrong", "isNew": true/false}],
  "wordsUsedCorrectly": ["word1", "word2"],
  "wordsIntroduced": [{"word": "...", "meaning": "..."}],
  "newFacts": ["fact about user learned this session"],
  "topicsTalkedAbout": ["topic1", "topic2"],
  "relationshipSummary": "Updated 1-2 sentence summary of your relationship with this user",
  "encouragement": "2 sentences. Mention something specific they did well.",
  "nextFocus": "One sentence: what to practice next time."
}

Rules:
- "levelSignal": +1 if they performed ABOVE their level (fewer errors than expected, longer responses, used complex structures). -1 if they struggled significantly. 0 if as expected.
- "strugglesObserved": Match to existing struggles when possible (isNew=false). Only mark isNew=true for genuinely new patterns. Max 3.
- "wordsUsedCorrectly": ONLY words from the "active words" list above that the USER produced correctly in their own messages.
- "wordsIntroduced": New vocabulary YOU introduced that wasn't in the active words list.
- "newFacts": Personal facts about the user revealed in conversation (hobbies, job, family, plans). Max 3. Skip if nothing new.
- "topicsTalkedAbout": 1-3 word labels for what you discussed.
- "relationshipSummary": Brief summary of your ongoing relationship. What do you know about them? What's the vibe?
- "encouragement": Be specific. "Your use of past tense was much better today" not "Great job!"
- "nextFocus": Based on struggles + level. "Practice asking questions in past tense" not "Keep practicing!"`
}

// ─── "What's Next" recommendation ───────────────────────────────────────────

export interface NextRecommendation {
  scenarioId: string
  title: string
  reason: string
}

/**
 * Decide what the user should practice next based on their profile.
 * This powers the home screen "Recommended" button.
 */
export function getNextRecommendation(profile: LearnerProfile): NextRecommendation {
  // If they have struggles, pick a scenario that targets the top one
  if (profile.struggles.length > 0) {
    const topStruggle = profile.struggles[0]
    const scenario = findScenarioForStruggle(topStruggle.pattern, profile.level)
    if (scenario) {
      return {
        scenarioId: scenario.id,
        title: scenario.title,
        reason: `Practice: ${topStruggle.pattern}`,
      }
    }
  }

  // If they have a last session, suggest continuing the same topic area
  if (profile.lastSession && profile.lastSession.scenarioId !== 'free-talk') {
    return {
      scenarioId: profile.lastSession.scenarioId,
      title: 'Continue where you left off',
      reason: profile.lastSession.topicsTalkedAbout.length > 0
        ? `Last time: ${profile.lastSession.topicsTalkedAbout[0]}`
        : 'Pick up from last session',
    }
  }

  // Default: free talk
  return {
    scenarioId: 'free-talk',
    title: 'Free Talk',
    reason: 'Chat about anything',
  }
}

/**
 * Find a scenario that targets a specific struggle pattern.
 * Maps common struggle patterns to relevant scenarios.
 */
function findScenarioForStruggle(pattern: string, level: number): ConversationSeed | null {
  // Pattern → scenario mapping (heuristic)
  const patternLower = pattern.toLowerCase()

  const mappings: Array<{ keywords: string[]; scenarioIds: string[] }> = [
    { keywords: ['past tense', 'past', 'yesterday', 'did'], scenarioIds: ['weekend-plans', 'travel-story', 'childhood-memories'] },
    { keywords: ['future', 'will', 'going to', 'plan'], scenarioIds: ['weekend-plans', 'travel-planning', 'career-goals'] },
    { keywords: ['question', 'asking', 'interrogative'], scenarioIds: ['job-interview', 'first-date', 'meeting-neighbor'] },
    { keywords: ['article', 'the', 'a', 'an', 'gender'], scenarioIds: ['shopping', 'describing-home', 'ordering-food'] },
    { keywords: ['preposition', 'in', 'on', 'at'], scenarioIds: ['giving-directions', 'describing-home', 'daily-routine'] },
    { keywords: ['conditional', 'if', 'would'], scenarioIds: ['travel-planning', 'career-goals', 'hypothetical'] },
    { keywords: ['vocabulary', 'word choice', 'synonym'], scenarioIds: ['free-talk'] },
    { keywords: ['pronunciation', 'sound'], scenarioIds: ['free-talk'] },
  ]

  for (const mapping of mappings) {
    if (mapping.keywords.some(k => patternLower.includes(k))) {
      for (const id of mapping.scenarioIds) {
        const seed = getSeedById(id)
        if (seed) return seed
      }
    }
  }

  return null
}
