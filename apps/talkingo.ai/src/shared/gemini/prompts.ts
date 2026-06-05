import type { ConversationState, TargetLanguage } from '../types'
import { getPersonaById, getPersonaPrompt } from './personas'
import { MASTER_PROMPT } from './master-prompt'
import { getLanguageMeta } from '../languages'
import { getLevelByNumber } from '../levels'
import { getSeedById } from '../curriculum'

// ─── Response format ──────────────────────────────────────────────────────────

const RESPONSE_FORMAT = `═══ RESPONSE FORMAT ═══

Return ONLY valid JSON (no markdown, no code fences):
{
  "response": "Your reply IN THE TARGET LANGUAGE. Use **bold** for vocabulary you want to highlight.",
  "corrections": [{"original":"wrong","corrected":"right","type":"grammar|vocabulary|pronunciation|naturalness","note":"max 15 words English"}],
  "vocab": [{"term":"new word/phrase","gloss":"English meaning","example":"optional"}],
  "teachingNote": {"type":"correction|expression|grammar|idiom|culture","title":"short title","content":"explanation in English or native language"} | null,
  "memoryUpdate": "Include only when something meaningful changed — a new mistake pattern, personal fact, progress, or vocabulary gap. Omit (return empty string) if nothing changed. Always include on session end. Max 150 words. Replace the full paragraph. Don't repeat static profile info (name, level, language)."
}

Field rules:
- "response": ALWAYS in the target language. Use **bold** for vocabulary you want to highlight.
- "corrections": ONLY errors from the current user message. If no errors, return [].
- "vocab": words YOU introduced this turn. If none, return [].
- "teachingNote": A SINGLE teaching card shown below your message. Use it ONLY when genuinely useful, not every turn. Set to null otherwise.
- "memoryUpdate": Include when you've learned something genuinely new. Not on a fixed schedule. Always include on session end. If user asks you to remember/forget, follow it here. Omit (return empty string) if nothing changed. Max 150 words. Replace full paragraph — don't append.`

// ─── Block builders ───────────────────────────────────────────────────────────

function buildLanguageBlock(targetLanguage: TargetLanguage | undefined): string {
  const meta = getLanguageMeta(targetLanguage)
  const scriptHint = meta.script === 'non-latin'
    ? `${meta.english} uses a non-Latin script. Always write "response" in the native script. Romanization only in "vocab" entries.`
    : `${meta.english} uses a Latin-based script. Do not romanize.`
  return `TARGET LANGUAGE: ${meta.english} (${meta.native}, BCP-47: ${meta.bcp47})
${scriptHint}
Write EVERYTHING in "response" in ${meta.english}. Never default to English.
If the user types/speaks in another language, gently nudge them back.
"translation" MUST be a faithful English translation of "response".`
}

function buildTalkingoLevelBlock(state?: ConversationState): string {
  const level = state?.talkingoLevel ?? 5
  const levelData = getLevelByNumber(level)
  return `${levelData.aiBehavior}

USER'S CURRENT LEVEL: ${level}/12 — "${levelData.name}"
Expected user output: ${levelData.expectedOutput}`
}

function buildPersonaBlock(state?: ConversationState): string {
  if (!state?.persona) return ''
  const persona = getPersonaById(state.persona)
  if (!persona) return ''
  return `\n\n${getPersonaPrompt(persona)}`
}

function buildScenarioBlock(state?: ConversationState): string {
  if (!state) return ''

  // Custom prompt from user — use it as the primary teaching focus
  if (state.customPrompt) {
    return `─── USER'S CUSTOM REQUEST ───
The user specifically wants to: ${state.customPrompt}

Treat this as the primary focus for the session. Teach relevant vocabulary and grammar naturally through conversation around this topic.`
  }

  // Real seed scenario
  const seed = state.currentUnitId && state.currentUnitId !== 'free-talk'
    ? getSeedById(state.currentUnitId)
    : null

  if (seed) {
    return `─── ACTIVE SCENARIO ───
Title: ${seed.title}
Brief: ${seed.scenarioBrief}
Target grammar: ${seed.targetGrammar.join(', ')}
Target vocabulary: ${seed.targetVocab.join(', ')}`
  }

  // Free talk — guide the conversation purposefully
  return `─── FREE TALK ───
No fixed scenario. Gently guide the user — ask what they'd like to talk about, suggest topics suited to their level, or pick up where a natural conversation would go. Keep it purposeful and make it a learning conversation.`
}

// ─── Memory block builder ────────────────────────────────────────────────────

function buildMemoryBlock(state?: ConversationState): string {
  const parts: string[] = []

  if (state?.memoryLifeline) {
    parts.push(`─── WHAT I REMEMBER ABOUT THIS USER ───
${state.memoryLifeline}`)
  }

  if (state?.userNotes) {
    parts.push(`─── THE USER'S OWN NOTES FOR ME ───
${state.userNotes}`)
  }

  if (parts.length === 0) return ''
  return parts.join('\n\n')
}

// ─── Main system instruction ──────────────────────────────────────────────────

export function getSystemInstruction(state?: ConversationState): string {
  const blocks = [
    MASTER_PROMPT,
    RESPONSE_FORMAT,
    buildLanguageBlock(state?.targetLanguage),
    buildTalkingoLevelBlock(state),
  ]
  
  // Add persona if selected
  const personaBlock = buildPersonaBlock(state)
  if (personaBlock) blocks.push(personaBlock)
  
  // Add scenario context so the AI is aware every single turn
  const scenarioBlock = buildScenarioBlock(state)
  if (scenarioBlock) blocks.push(scenarioBlock)

  // Add cross-session memory block (AI memory + user notes)
  const memoryBlock = buildMemoryBlock(state)
  if (memoryBlock) blocks.push(memoryBlock)
  
  return blocks.filter(Boolean).join('\n\n')
}

// ─── User-turn prompts ────────────────────────────────────────────────────────

export function buildConversationPrompt(
  userText: string,
  state: ConversationState,
  userName?: string
): string {
  // Compact inline reminder to keep the scenario front-and-center each turn
  const seed = state.currentUnitId && state.currentUnitId !== 'free-talk'
    ? getSeedById(state.currentUnitId)
    : null

  let contextLine = ''
  if (state.customPrompt) {
    contextLine = `[Teaching focus: ${state.customPrompt}]`
  } else if (seed) {
    contextLine = `[Scenario: ${seed.title} — grammar focus: ${seed.targetGrammar.join(', ')}]`
  }

  const prefix = contextLine ? `${contextLine}\n\n` : ''

  if (userName) {
    return `${prefix}[User: ${userName}]\n\n${userText}`
  }
  return `${prefix}${userText}`
}

export function buildOpenerPrompt(state: ConversationState, userName?: string): string {
  // ── Build scenario block from seed data ───────────────────────────────────
  const seed = state.currentUnitId && state.currentUnitId !== 'free-talk'
    ? getSeedById(state.currentUnitId)
    : null

  // Custom scenario — embed the user's prompt directly into the opener
  if (state.customPrompt) {
    const userInfo = userName ? `\n- User name: ${userName}` : ''
    return `Open a fresh session. The user has a specific topic in mind.

Context:
- Target language: ${getLanguageMeta(state.targetLanguage).english}${userInfo}

─── USER'S REQUEST ───
${state.customPrompt}

Open IN THE TARGET LANGUAGE. Acknowledge their request naturally, then ask a warm opening question about it. Be natural — don't sound like a robot reading instructions. Return JSON.`
  }

  const scenarioBlock = seed
    ? `─── SCENARIO CONTEXT ───
Title: ${seed.title}
Brief: ${seed.scenarioBrief}
Target grammar: ${seed.targetGrammar.join(', ')}
Target vocabulary: ${seed.targetVocab.join(', ')}`
    : `─── FREE TALK ───
The user chose open conversation. Ask warmly if they have anything specific they'd like to practice or talk about today. If they're unsure, suggest a natural topic suited to their level (e.g., weekend plans, hobbies, daily life). Keep it light and inviting.`

  const userInfo = userName ? `\n- User name: ${userName}` : ''

  return `Open a fresh session. The user just arrived.

Context:
- Target language: ${getLanguageMeta(state.targetLanguage).english}${userInfo}

${scenarioBlock}

Open IN THE TARGET LANGUAGE. Be warm, natural, and end with something that makes them want to respond. Return JSON.`
}

// ─── Assessment (placement) ───────────────────────────────────────────────────

export function buildAssessmentSystemInstruction(targetLanguage: TargetLanguage | undefined): string {
  const meta = getLanguageMeta(targetLanguage)
  return `You are a placement examiner for ${meta.english}.

The user has just had a short conversation. Judge their command of ${meta.english} and output a talkingoLevel from 1-12.

Output ONLY this JSON:
{
  "talkingoLevel": 1-12,
  "encouragement": "One warm sentence in English praising something specific."
}`
}

export function buildAssessmentPrompt(
  transcript: Array<{ role: 'user' | 'ai'; text: string }>,
  targetLanguage: TargetLanguage | undefined
): string {
  const meta = getLanguageMeta(targetLanguage)
  const transcriptStr = transcript.map((t) => `${t.role === 'user' ? 'USER' : 'AI'}: ${t.text}`).join('\n')
  return `Target language: ${meta.english}.\n\nConversation transcript:\n${transcriptStr}\n\nAssess the USER's language level from 1-12. Return JSON per instructions.`
}
