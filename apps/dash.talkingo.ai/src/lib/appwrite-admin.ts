import { Client, Databases, Users, Query, ID } from 'node-appwrite'

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ''
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''
const apiKey = process.env.APPWRITE_API_KEY || ''

const missingVars = []
if (!endpoint) missingVars.push('NEXT_PUBLIC_APPWRITE_ENDPOINT')
if (!projectId) missingVars.push('NEXT_PUBLIC_APPWRITE_PROJECT_ID')
if (!apiKey) missingVars.push('APPWRITE_API_KEY')
if (missingVars.length > 0) {
  console.warn(`[admin] Missing env vars: ${missingVars.join(', ')}. Server features will fail.`)
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey)

export const databases = new Databases(client)
export const users = new Users(client)

export const DB_ID = 'talkingo_db'

export const COLLECTIONS = {
  USER_PREFERENCES: 'user_preferences',
  LANGUAGE_PROGRESS: 'language_progress',
  SESSION_ANALYTICS: 'session_analytics',
  NOTIFICATIONS: 'notifications',
  SYSTEM_CONFIG: 'system_config',
} as const

export interface AppwriteUser {
  $id: string
  email: string
  name: string
  emailVerification: boolean
  status: boolean
  labels: string[]
  $createdAt: string
  $updatedAt: string
}

export interface NotificationDoc {
  $id?: string
  userId: string
  type: 'announcement' | 'achievement' | 'tip' | 'warning' | 'update'
  title: string
  message: string
  link?: string
  imageUrl?: string
  read: boolean
  createdAt: number
  createdBy: string
  targetAll: boolean
}

export interface SessionAnalyticsDoc {
  $id: string
  sessionId: string
  userId: string
  targetLanguage: string
  seedId: string
  seedTitle: string
  durationSeconds: number
  messageCount: number
  correctionCount: number
  vocabIntroduced: number
  unitComplete: boolean
  abandoned: boolean
  timestamp: number
  domainScoresBefore?: string
  domainScoresAfter?: string
}

export interface UserPreferencesDoc {
  $id: string
  userId: string
  userName?: string
  level: string
  talkingoLevel?: number
  targetLanguage?: string
  learningGoal?: string
  onboardingComplete?: boolean
  currentUnitId?: string
  createdAt: number
  updatedAt: number
}

export interface LanguageProgressDoc {
  $id: string
  userId: string
  targetLanguage: string
  talkingoLevel: number
  totalSessions: number
  totalMinutes: number
  streakDays: number
  lastSessionAt?: number
  completedUnits?: string[]
  weakPatterns?: string[]
  updatedAt: number
}

export async function listAllUsers(limit = 100, offset = 0): Promise<AppwriteUser[]> {
  const res = await users.list([Query.limit(limit), Query.offset(offset)])
  return res.users as unknown as AppwriteUser[]
}

export async function getUserById(userId: string): Promise<AppwriteUser> {
  return users.get(userId) as unknown as AppwriteUser
}

export async function updateUserLabels(userId: string, labels: string[]): Promise<void> {
  await users.updateLabels(userId, labels)
}

export async function deleteUser(userId: string): Promise<void> {
  await users.delete(userId)
}

export async function blockUser(userId: string): Promise<void> {
  await users.updateStatus(userId, false)
}

export async function unblockUser(userId: string): Promise<void> {
  await users.updateStatus(userId, true)
}

export async function getTotalUserCount(): Promise<number> {
  const res = await users.list([Query.limit(1)])
  return res.total
}

export async function getRecentSessions(limit = 50): Promise<SessionAnalyticsDoc[]> {
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.SESSION_ANALYTICS, [
    Query.orderDesc('timestamp'),
    Query.limit(limit),
  ])
  return res.documents as unknown as SessionAnalyticsDoc[]
}

export async function getSessionsInRange(from: number, to: number): Promise<SessionAnalyticsDoc[]> {
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.SESSION_ANALYTICS, [
    Query.greaterThanEqual('timestamp', from),
    Query.lessThanEqual('timestamp', to),
    Query.orderDesc('timestamp'),
    Query.limit(500),
  ])
  return res.documents as unknown as SessionAnalyticsDoc[]
}

export async function getSessionsBySeed(seedId: string, limit = 100): Promise<SessionAnalyticsDoc[]> {
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.SESSION_ANALYTICS, [
    Query.equal('seedId', seedId),
    Query.orderDesc('timestamp'),
    Query.limit(limit),
  ])
  return res.documents as unknown as SessionAnalyticsDoc[]
}

export async function getSessionsByUser(userId: string): Promise<SessionAnalyticsDoc[]> {
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.SESSION_ANALYTICS, [
    Query.equal('userId', userId),
    Query.orderDesc('timestamp'),
    Query.limit(200),
  ])
  return res.documents as unknown as SessionAnalyticsDoc[]
}

export async function getTotalSessionCount(): Promise<number> {
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.SESSION_ANALYTICS, [Query.limit(1)])
  return res.total
}

export async function getEfficiencyMetrics(): Promise<{
  storageSavedMB: number
  apiCallsSaved: number
  estimatedCostSavedUSD: number
}> {
  const totalSessions = await getTotalSessionCount()
  const AVG_FULL_TRANSCRIPT_KB = 50
  const AVG_OPTIMIZED_KB = 1.5
  const COST_PER_GB_STORAGE = 0.10
  const COST_PER_API_CALL = 0.000002
  const savedPerSessionKB = AVG_FULL_TRANSCRIPT_KB - AVG_OPTIMIZED_KB
  const totalSavedKB = (totalSessions * savedPerSessionKB) / 1024
  const storageSavedMB = parseFloat(totalSavedKB.toFixed(2))
  const apiCallsSaved = Math.floor(totalSessions * 0.9)
  const estimatedCostSavedUSD = parseFloat(
    ((storageSavedMB / 1024 * COST_PER_GB_STORAGE) + (apiCallsSaved * COST_PER_API_CALL)).toFixed(4)
  )
  return { storageSavedMB, apiCallsSaved, estimatedCostSavedUSD }
}

export async function getAllUserPreferences(limit = 500): Promise<UserPreferencesDoc[]> {
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.USER_PREFERENCES, [
    Query.limit(limit),
    Query.orderDesc('createdAt'),
  ])
  return res.documents as unknown as UserPreferencesDoc[]
}

export async function getUserPreferences(userId: string): Promise<UserPreferencesDoc | null> {
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.USER_PREFERENCES, [
    Query.equal('userId', userId),
    Query.limit(1),
  ])
  if (res.documents.length === 0) return null
  return res.documents[0] as unknown as UserPreferencesDoc
}

export async function getUserProgress(userId: string): Promise<LanguageProgressDoc[]> {
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.LANGUAGE_PROGRESS, [
    Query.equal('userId', userId),
  ])
  return res.documents as unknown as LanguageProgressDoc[]
}

export async function createNotification(
  notification: Omit<NotificationDoc, '$id'>
): Promise<NotificationDoc> {
  const doc = await databases.createDocument(
    DB_ID,
    COLLECTIONS.NOTIFICATIONS,
    ID.unique(),
    notification
  )
  return doc as unknown as NotificationDoc
}

export async function getNotificationsForUser(userId: string): Promise<NotificationDoc[]> {
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.NOTIFICATIONS, [
    Query.or([
      Query.equal('userId', userId),
      Query.equal('targetAll', true),
    ]),
    Query.orderDesc('createdAt'),
    Query.limit(50),
  ])
  return res.documents as unknown as NotificationDoc[]
}

export async function getAllNotifications(limit = 100): Promise<NotificationDoc[]> {
  const res = await databases.listDocuments(DB_ID, COLLECTIONS.NOTIFICATIONS, [
    Query.orderDesc('createdAt'),
    Query.limit(limit),
  ])
  return res.documents as unknown as NotificationDoc[]
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await databases.deleteDocument(DB_ID, COLLECTIONS.NOTIFICATIONS, notificationId)
}

export async function getSessionsLastNDays(days: number): Promise<SessionAnalyticsDoc[]> {
  const from = Date.now() - days * 24 * 60 * 60 * 1000
  return getSessionsInRange(from, Date.now())
}

export async function getSeedPerformance(): Promise<
  Array<{
    seedId: string
    seedTitle: string
    totalSessions: number
    completedSessions: number
    abandonedSessions: number
    totalCorrections: number
    totalDuration: number
    completionRate: number
    abandonmentRate: number
    avgCorrectionsPerSession: number
    avgDurationSeconds: number
  }>
> {
  const sessions = await getRecentSessions(500)
  const map = new Map<string, {
    seedId: string
    seedTitle: string
    total: number
    completed: number
    abandoned: number
    corrections: number
    duration: number
  }>()

  for (const s of sessions) {
    const existing = map.get(s.seedId) ?? {
      seedId: s.seedId,
      seedTitle: s.seedTitle,
      total: 0,
      completed: 0,
      abandoned: 0,
      corrections: 0,
      duration: 0,
    }
    existing.total++
    if (s.unitComplete) existing.completed++
    if (s.abandoned) existing.abandoned++
    existing.corrections += s.correctionCount
    existing.duration += s.durationSeconds
    map.set(s.seedId, existing)
  }

  return Array.from(map.values()).map((s) => ({
    seedId: s.seedId,
    seedTitle: s.seedTitle,
    totalSessions: s.total,
    completedSessions: s.completed,
    abandonedSessions: s.abandoned,
    totalCorrections: s.corrections,
    totalDuration: s.duration,
    completionRate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
    abandonmentRate: s.total > 0 ? Math.round((s.abandoned / s.total) * 100) : 0,
    avgCorrectionsPerSession: s.total > 0 ? parseFloat((s.corrections / s.total).toFixed(1)) : 0,
    avgDurationSeconds: s.total > 0 ? Math.round(s.duration / s.total) : 0,
  }))
}

