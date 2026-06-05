// Simple persistence for completed lesson IDs
// Using localStorage directly since the broader LanguageProgress system is frozen.

const STORAGE_KEY = 'talkingo_completed_lessons'

export function getCompletedLessons(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function markLessonComplete(lessonId: string): string[] {
  const current = getCompletedLessons()
  if (current.includes(lessonId)) return current
  const updated = [...current, lessonId]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch { /* storage full */ }
  return updated
}

export function isLessonComplete(lessonId: string): boolean {
  return getCompletedLessons().includes(lessonId)
}
