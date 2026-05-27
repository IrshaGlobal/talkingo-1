/**
 * Hybrid storage orchestrator — preferences only.
 *
 * STORAGE STRATEGY (simplified):
 * - Appwrite DB: user_preferences + learner_profiles (irreplaceable, cross-device)
 * - localStorage: chat sessions (auto-saved transcripts), settings, profile cache
 *
 * The old conversation transcript saving and language_progress sync was removed
 * — those responsibilities now live in chat-sessions.ts and learner-profile.
 */

import type { UserPreferences } from '@talkingo/shared/types'
import {
  saveUserPreferences,
  getUserPreferences,
} from './appwrite-storage'
import { updateAccountPrefs, type AccountPrefsPayload } from '../auth/auth'
import { validatePreferences } from '../utils/onboarding-check'

// ─── Settings Storage Interface ──────────────────────────────────────────────

export interface AppSettings {
  micSensitivity: number
  noiseCancellation: boolean
  theme: 'light' | 'dark' | 'auto'
  language: string
  autoSaveTranscripts: boolean
  aiCorrections: boolean
  realTimeTranslation: boolean
  conversationMode: 'casual' | 'professional' | 'academic'
  voiceSpeed: number
  /** When to auto-play AI voice notes in chat mode. */
  autoPlayVoiceNotes?: 'always' | 'handsfree-only' | 'never'
}

// Helper to get user-specific keys
const prefsKey = (userId: string | null) => `talkingo_prefs_${userId || 'anon'}`
const onboardedKey = (userId: string | null) => `talkingo_onboarded_${userId || 'anon'}`
const settingsKey = (userId: string | null) => `talkingo_settings_${userId || 'anon'}`

// ─── Onboarding flag ─────────────────────────────────────────────────────────

export function isOnboarded(userId?: string | null): boolean {
  try {
    const key = onboardedKey(userId || null)
    if (localStorage.getItem(key) === 'true') return true
    const prefs = localStorage.getItem(prefsKey(userId || null))
    if (prefs) {
      try {
        const parsed = JSON.parse(prefs)
        return !!(parsed.targetLanguage && (parsed.level || parsed.cefr) && parsed.learningGoal)
      } catch {
        return false
      }
    }
    return false
  } catch {
    return false
  }
}

export function markOnboarded(userId?: string | null): void {
  try {
    const key = onboardedKey(userId || null)
    localStorage.setItem(key, 'true')
  } catch {
    // ignore quota errors
  }
}

// ─── Preferences Storage ─────────────────────────────────────────────────────

function essentialPrefsForAccount(p: UserPreferences): AccountPrefsPayload {
  return {
    onboardingComplete: p.onboardingComplete,
    targetLanguage: p.targetLanguage,
    nativeLanguage: p.nativeLanguage,
    level: p.level,
    cefr: p.cefr,
    learningGoal: p.learningGoal,
    topic: typeof p.topic === 'string' ? p.topic : undefined,
    correctionStyle: p.correctionStyle,
    persona: p.persona,
    userName: p.userName,
    currentUnitId: p.currentUnitId,
    preferredScript: p.preferredScript,
    learnerGender: p.learnerGender,
  }
}

export function preferencesFromAccountPrefs(
  ap: AccountPrefsPayload | null | undefined
): UserPreferences | null {
  if (!ap || !ap.targetLanguage) return null
  return {
    level: (ap.level as UserPreferences['level']) ?? 'beginner',
    cefr: ap.cefr as UserPreferences['cefr'],
    topic: ap.topic ?? 'general',
    correctionStyle: (ap.correctionStyle as UserPreferences['correctionStyle']) ?? 'silent',
    persona: ap.persona as UserPreferences['persona'],
    userName: ap.userName,
    targetLanguage: ap.targetLanguage as UserPreferences['targetLanguage'],
    nativeLanguage: ap.nativeLanguage,
    learningGoal: ap.learningGoal as UserPreferences['learningGoal'],
    onboardingComplete: ap.onboardingComplete,
    currentUnitId: ap.currentUnitId,
    preferredScript: ap.preferredScript as UserPreferences['preferredScript'],
    learnerGender: ap.learnerGender as UserPreferences['learnerGender'],
  }
}

export async function savePreferences(
  userId: string | null,
  preferences: UserPreferences,
  isAuthenticated: boolean
): Promise<void> {
  const validation = validatePreferences(preferences)
  if (!validation.isValid) {
    console.warn('[Storage] Saving incomplete preferences:', {
      userId,
      missingFields: validation.missingFields,
    })
  }

  const key = prefsKey(userId)
  try {
    localStorage.setItem(key, JSON.stringify(preferences))
    if (preferences.onboardingComplete) markOnboarded(userId)
  } catch (error) {
    console.error('[Storage] Failed to save preferences to localStorage:', error)
  }

  if (isAuthenticated && userId) {
    const results = await Promise.allSettled([
      updateAccountPrefs(essentialPrefsForAccount(preferences)),
      saveUserPreferences(userId, preferences),
    ])
    const accountOk = results[0].status === 'fulfilled'
    const docOk = results[1].status === 'fulfilled'
    if (!accountOk) {
      console.warn('[Storage] Account prefs sync failed:', (results[0] as PromiseRejectedResult).reason)
    }
    if (!docOk) {
      console.warn('[Storage] Document sync failed:', (results[1] as PromiseRejectedResult).reason)
    }
  }
}

export async function loadPreferences(
  userId: string | null,
  isAuthenticated: boolean,
  accountPrefs?: AccountPrefsPayload | null
): Promise<UserPreferences | null> {
  // Path 1: Account Prefs (instant, zero-network)
  const fromAccount = preferencesFromAccountPrefs(accountPrefs)
  if (fromAccount && fromAccount.onboardingComplete) {
    try {
      localStorage.setItem(prefsKey(userId), JSON.stringify(fromAccount))
    } catch { /* ignore */ }

    if (isAuthenticated && userId) {
      void getUserPreferences(userId).then(doc => {
        if (!doc) return
        const enriched: UserPreferences = {
          ...fromAccount,
          domainScores: doc.domainScores ?? fromAccount.domainScores,
        }
        try { localStorage.setItem(prefsKey(userId), JSON.stringify(enriched)) } catch { /* ignore */ }
      }).catch(() => { /* non-critical */ })
    }
    return fromAccount
  }

  // Path 2: user_preferences document
  let backendPrefs: UserPreferences | null = null
  if (isAuthenticated && userId) {
    try {
      const doc = await getUserPreferences(userId)
      if (doc) {
        backendPrefs = {
          level: doc.level,
          cefr: doc.cefr,
          domainScores: doc.domainScores,
          topic: doc.topic,
          correctionStyle: doc.correctionStyle,
          persona: doc.persona,
          userName: doc.userName || undefined,
          targetLanguage: doc.targetLanguage,
          learningGoal: doc.learningGoal,
          onboardingComplete: doc.onboardingComplete,
          currentUnitId: doc.currentUnitId,
        }
        try {
          localStorage.setItem(prefsKey(userId), JSON.stringify(backendPrefs))
        } catch { /* ignore */ }

        if (backendPrefs.onboardingComplete && !accountPrefs?.onboardingComplete) {
          void updateAccountPrefs(essentialPrefsForAccount(backendPrefs)).catch(() => {})
        }
      }
    } catch (error) {
      console.warn('[Storage] Backend document load failed:', error)
    }
  }

  if (backendPrefs) return backendPrefs
  if (fromAccount) return fromAccount

  // Path 3: localStorage fallback
  try {
    const saved = localStorage.getItem(prefsKey(userId))
    if (saved) return JSON.parse(saved)
  } catch (error) {
    console.error('[Storage] Failed to load preferences from localStorage:', error)
  }

  return null
}

// ─── App Settings Storage (localStorage ONLY) ───────────────────────────────

export function saveSettings(settings: AppSettings, userId?: string | null): void {
  try {
    localStorage.setItem(settingsKey(userId ?? null), JSON.stringify(settings))
  } catch (error) {
    console.error('[Storage] Failed to save settings:', error)
  }
}

export function loadSettings(userId?: string | null): AppSettings | null {
  try {
    const saved = localStorage.getItem(settingsKey(userId ?? null))
    if (saved) return JSON.parse(saved)
  } catch (error) {
    console.error('[Storage] Failed to load settings:', error)
  }
  return null
}
