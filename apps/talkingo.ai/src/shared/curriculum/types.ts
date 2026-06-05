/**
 * Curriculum types
 */

import type { GrammarTag } from './grammar-tags'

export interface ConversationSeed {
  /** Unique identifier: "{topic-family}-l{level}" e.g. "food-l01" */
  id: string
  /** Short display title for the UI */
  title: string
  /** One-line description shown below the title */
  blurb: string
  /** Exact level 1-12 — each seed belongs to exactly ONE level */
  level: number
  /** Spiral topic family name — connects scenarios across levels */
  spiralGroup: string
  /** Which turn in the spiral (1 = first appearance, 2 = second, etc.) */
  spiralOrder: number
  /** Seed IDs recommended to complete before this one */
  prerequisites: string[]
  /** UI category for filtering: 'Daily Life' | 'Social' | 'Travel' | 'Work & Study' | 'Ideas & Stories' | 'Culture & Deep' | 'Expression' */
  category: string
  /** Natural conversation context for the AI — not a roleplay script */
  scenarioBrief: string
  /** Grammar that naturally emerges in this conversation */
  targetGrammar: GrammarTag[]
  /** Vocabulary domains that naturally arise */
  targetVocab: string[]
  /** Within-level difficulty: 'core' | 'practice' | 'challenge' */
  difficulty: 'core' | 'practice' | 'challenge'
}

export interface Scenario {
  id: string
  title: string
  description: string
  category: string
  difficulty: string
}
