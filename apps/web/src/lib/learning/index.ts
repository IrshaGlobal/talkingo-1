/**
 * Learning System — unified exports.
 *
 * This is the new learning brain. One profile, one brief, one digest.
 */

// Types
export type {
  LearnerProfile,
  Struggle,
  ActiveWord,
  LastSession,
} from './learner-profile'

// Profile creation
export { createEmptyProfile } from './learner-profile'
export {
  MAX_STRUGGLES,
  MAX_ACTIVE_WORDS,
  MAX_GRADUATED_WORDS,
  MAX_ABOUT_USER,
  LEVEL_UP_THRESHOLD,
  LEVEL_DOWN_THRESHOLD,
} from './learner-profile'

// Storage
export {
  loadProfile,
  saveProfile,
  loadProfileLocal,
} from './profile-storage'

// Session digest (what AI returns at session end)
export type { SessionDigest } from './session-digest'
export { mergeDigestIntoProfile } from './session-digest'

// AI brief builder (what AI receives at session start)
export {
  buildSessionBrief,
  buildOpenerPrompt,
  buildDigestPrompt,
  getNextRecommendation,
} from './build-ai-brief'
export type { NextRecommendation } from './build-ai-brief'

// State adapter (LearnerProfile → ConversationState for prompt builder)
export { buildConversationState, progressFromProfile } from './state-adapter'

// Migration
export { migrateToProfile, needsMigration } from './migrate-to-profile'
