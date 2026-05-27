/**
 * LearnerProfile storage — Appwrite + localStorage cache.
 *
 * One read at session start. One write at session end. That's it.
 */

import type { TargetLanguage, PersonaId } from '@talkingo/shared/types'
import type { LearnerProfile } from './learner-profile'
import { createEmptyProfile } from './learner-profile'
import { databases } from '../api/appwrite'
import { Permission, Role } from 'appwrite'
import { APPWRITE_DB_ID, COLLECTION_IDS } from '../appwrite-schema'

// ─── Constants ───────────────────────────────────────────────────────────────

const COLLECTION = COLLECTION_IDS.LEARNER_PROFILES
const localKey = (userId: string | null, lang: TargetLanguage) =>
  `talkingo_profile_${userId || 'anon'}_${lang}`

// ─── localStorage (instant) ──────────────────────────────────────────────────

function loadLocal(userId: string | null, lang: TargetLanguage): LearnerProfile | null {
  try {
    const raw = localStorage.getItem(localKey(userId, lang))
    if (!raw) return null
    return JSON.parse(raw) as LearnerProfile
  } catch {
    return null
  }
}

function saveLocal(userId: string | null, profile: LearnerProfile): void {
  try {
    localStorage.setItem(localKey(userId, profile.targetLanguage), JSON.stringify(profile))
  } catch {
    // ignore quota errors
  }
}

// ─── Appwrite ────────────────────────────────────────────────────────────────

function docId(userId: string, lang: TargetLanguage): string {
  return `${userId}_${lang}`
}

function ownerPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}

async function loadFromAppwrite(userId: string, lang: TargetLanguage): Promise<LearnerProfile | null> {
  try {
    const doc = await databases.getDocument(APPWRITE_DB_ID, COLLECTION, docId(userId, lang))
    // Parse JSON fields
    return {
      userId: doc.userId,
      targetLanguage: doc.targetLanguage,
      nativeLanguage: doc.nativeLanguage,
      persona: doc.persona,
      userName: doc.userName || undefined,
      level: doc.level,
      sessionsAtLevel: doc.sessionsAtLevel ?? 0,
      levelUpSignals: doc.levelUpSignals ?? 0,
      levelDownSignals: doc.levelDownSignals ?? 0,
      struggles: doc.struggles ? JSON.parse(doc.struggles) : [],
      activeWords: doc.activeWords ? JSON.parse(doc.activeWords) : [],
      graduatedWords: doc.graduatedWords ? JSON.parse(doc.graduatedWords) : [],
      lastSession: doc.lastSession ? JSON.parse(doc.lastSession) : null,
      aboutUser: doc.aboutUser ? JSON.parse(doc.aboutUser) : [],
      relationshipSummary: doc.relationshipSummary ?? '',
      sessionCount: doc.sessionCount ?? 0,
      totalMinutes: doc.totalMinutes ?? 0,
      streak: doc.streak ?? 0,
      lastSessionAt: doc.lastSessionAt ?? null,
      totalWordsGraduated: doc.totalWordsGraduated ?? 0,
      totalStrugglesResolved: doc.totalStrugglesResolved ?? 0,
      createdAt: doc.createdAt ?? Date.now(),
      updatedAt: doc.updatedAt ?? Date.now(),
    }
  } catch (error: any) {
    const code = error?.code ?? error?.status ?? 0
    if (code === 404) return null
    console.warn('[LearnerProfile] Appwrite load failed:', error)
    return null
  }
}

async function saveToAppwrite(profile: LearnerProfile): Promise<void> {
  const id = docId(profile.userId, profile.targetLanguage)
  const doc = {
    userId: profile.userId,
    targetLanguage: profile.targetLanguage,
    nativeLanguage: profile.nativeLanguage,
    persona: profile.persona,
    userName: profile.userName || null,
    level: profile.level,
    sessionsAtLevel: profile.sessionsAtLevel,
    levelUpSignals: profile.levelUpSignals,
    levelDownSignals: profile.levelDownSignals,
    struggles: JSON.stringify(profile.struggles),
    activeWords: JSON.stringify(profile.activeWords),
    graduatedWords: JSON.stringify(profile.graduatedWords),
    lastSession: JSON.stringify(profile.lastSession),
    aboutUser: JSON.stringify(profile.aboutUser),
    relationshipSummary: profile.relationshipSummary,
    sessionCount: profile.sessionCount,
    totalMinutes: profile.totalMinutes,
    streak: profile.streak,
    lastSessionAt: profile.lastSessionAt,
    totalWordsGraduated: profile.totalWordsGraduated,
    totalStrugglesResolved: profile.totalStrugglesResolved,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }

  try {
    await databases.updateDocument(APPWRITE_DB_ID, COLLECTION, id, doc)
  } catch (error: any) {
    const code = error?.code ?? error?.status ?? 0
    if (code !== 404) throw error
    // Create new document
    await databases.createDocument(
      APPWRITE_DB_ID,
      COLLECTION,
      id,
      doc,
      ownerPermissions(profile.userId)
    )
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Load the learner profile. Tries Appwrite first (authoritative), falls back to localStorage.
 * If neither exists, returns null (caller should create a new profile).
 */
export async function loadProfile(
  userId: string | null,
  isAuthenticated: boolean,
  targetLanguage: TargetLanguage
): Promise<LearnerProfile | null> {
  // Try Appwrite first if authenticated
  if (isAuthenticated && userId) {
    try {
      const backend = await loadFromAppwrite(userId, targetLanguage)
      if (backend) {
        saveLocal(userId, backend) // update cache
        return backend
      }
    } catch (error) {
      console.warn('[LearnerProfile] Backend load failed, using cache:', error)
    }
  }

  // Fall back to localStorage
  return loadLocal(userId, targetLanguage)
}

/**
 * Save the learner profile. Writes to localStorage immediately, then syncs to Appwrite.
 */
export async function saveProfile(
  userId: string | null,
  isAuthenticated: boolean,
  profile: LearnerProfile
): Promise<void> {
  // Always save to localStorage first (instant)
  saveLocal(userId, profile)

  // Sync to Appwrite (non-blocking for UX, but we await for data safety)
  if (isAuthenticated && userId) {
    try {
      await saveToAppwrite(profile)
    } catch (error) {
      console.warn('[LearnerProfile] Appwrite sync failed:', error)
      // Data is safe in localStorage — will retry next session
    }
  }
}

/**
 * Quick load from localStorage only (for home screen, no network).
 */
export function loadProfileLocal(
  userId: string | null,
  targetLanguage: TargetLanguage
): LearnerProfile | null {
  return loadLocal(userId, targetLanguage)
}
