export interface SeedAnalytics {
  id: string
  title: string
  levelRange: [number, number]  // e.g., [1, 3]
  totalSessions: number
  completionRate: number  // percentage
  avgCorrectionsPerSession: number
  abandonmentRate: number  // percentage
}

export interface LearnerOverview {
  totalUsers: number
  activeUsers: number
  avgSessionsPerUser: number
  avgStreakDays: number
  levelDistribution: Record<number, number>  // { 1: 10, 2: 15, ... }
}

export interface SessionFeed {
  id: string
  userId: string  // anonymized
  language: string
  seedUsed: string
  duration: number  // seconds
  domainScoreChange: number
  correctionsCount: number
  timestamp: number
}
