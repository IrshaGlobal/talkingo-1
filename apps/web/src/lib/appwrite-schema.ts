/**
 * Single source of truth for Appwrite database & collection IDs.
 *
 * Whenever you add a new collection in code, declare it here AND add a
 * matching block to scripts/setup-appwrite-schema.ts so the schema can be
 * provisioned with `npm run db:setup`.
 *
 * Don't hardcode collection IDs in route files — import them from here.
 */

export const APPWRITE_DB_ID = 'talkingo_db'

export const COLLECTION_IDS = {
  /** Onboarding state mirror (level, persona, target/native lang, goal) */
  USER_PREFERENCES: 'user_preferences',
  /** Stripe subscription state (one doc per user) */
  SUBSCRIPTIONS: 'subscriptions',
  /** Stripe webhook idempotency log (doc id = stripe event id) */
  WEBHOOK_EVENTS: 'stripe_webhook_events',
  /** Free-tier daily message counter (doc id = `${userId}_${YYYY-MM-DD}`) */
  FREE_USAGE: 'free_tier_usage',
  /** Admin-pushed in-app notifications */
  NOTIFICATIONS: 'notifications',
  /** Key-value system config (e.g. master_prompt for Live API) */
  SYSTEM_CONFIG: 'system_config',
  /** Unified learner profile (one doc per user×language) — the learning brain */
  LEARNER_PROFILES: 'learner_profiles',
} as const

export type CollectionId = (typeof COLLECTION_IDS)[keyof typeof COLLECTION_IDS]
