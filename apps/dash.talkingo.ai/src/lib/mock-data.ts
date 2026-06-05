import type { SeedAnalytics, LearnerOverview, SessionFeed } from '@/types/analytics'

export function getMockSeeds(): SeedAnalytics[] {
  return [
    { id: '1', title: 'Coffee Shop Chat', levelRange: [1, 3], totalSessions: 245, completionRate: 78, avgCorrectionsPerSession: 3.2, abandonmentRate: 12 },
    { id: '2', title: 'Job Interview Prep', levelRange: [4, 6], totalSessions: 189, completionRate: 65, avgCorrectionsPerSession: 5.8, abandonmentRate: 22 },
    { id: '3', title: 'Travel Directions', levelRange: [1, 2], totalSessions: 312, completionRate: 85, avgCorrectionsPerSession: 2.1, abandonmentRate: 8 },
    { id: '4', title: 'Restaurant Ordering', levelRange: [3, 4], totalSessions: 278, completionRate: 82, avgCorrectionsPerSession: 2.9, abandonmentRate: 10 },
    { id: '5', title: 'Business Meeting', levelRange: [6, 8], totalSessions: 156, completionRate: 58, avgCorrectionsPerSession: 7.3, abandonmentRate: 28 },
    { id: '6', title: 'Making Friends', levelRange: [3, 5], totalSessions: 223, completionRate: 72, avgCorrectionsPerSession: 4.1, abandonmentRate: 15 },
    { id: '7', title: 'Doctor Visit', levelRange: [4, 5], totalSessions: 198, completionRate: 69, avgCorrectionsPerSession: 4.5, abandonmentRate: 18 },
    { id: '8', title: 'Shopping Dialogue', levelRange: [1, 3], totalSessions: 267, completionRate: 80, avgCorrectionsPerSession: 2.7, abandonmentRate: 11 },
    { id: '9', title: 'Academic Discussion', levelRange: [9, 12], totalSessions: 134, completionRate: 52, avgCorrectionsPerSession: 8.9, abandonmentRate: 32 },
    { id: '10', title: 'Hotel Check-in', levelRange: [3, 4], totalSessions: 289, completionRate: 83, avgCorrectionsPerSession: 2.5, abandonmentRate: 9 },
  ]
}

export function getMockLearnerOverview(): LearnerOverview {
  return {
    totalUsers: 1247,
    activeUsers: 423,
    avgSessionsPerUser: 12.4,
    avgStreakDays: 8.7,
    levelDistribution: {
      1: 120,
      2: 125,
      3: 150,
      4: 162,
      5: 139,
      6: 150,
      7: 98,
      8: 100,
      9: 80,
      10: 54,
      11: 40,
      12: 29,
    },
  }
}

export function getMockSessionFeed(): SessionFeed[] {
  const sessions: SessionFeed[] = []
  const languages = ['English', 'Spanish', 'French', 'German', 'Japanese']
  const seeds = ['Coffee Shop Chat', 'Job Interview Prep', 'Travel Directions', 'Restaurant Ordering', 'Business Meeting']
  
  for (let i = 0; i < 50; i++) {
    sessions.push({
      id: `session-${i}`,
      userId: `user-${Math.random().toString(36).substring(7)}`,
      language: languages[Math.floor(Math.random() * languages.length)],
      seedUsed: seeds[Math.floor(Math.random() * seeds.length)],
      duration: Math.floor(Math.random() * 1800) + 60, // 1-30 minutes
      domainScoreChange: Math.floor(Math.random() * 20) - 5, // -5 to +15
      correctionsCount: Math.floor(Math.random() * 15),
      timestamp: Date.now() - Math.floor(Math.random() * 86400000), // Last 24 hours
    })
  }
  
  return sessions.sort((a, b) => b.timestamp - a.timestamp)
}
