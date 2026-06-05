import { Client, Databases, Account } from 'node-appwrite'

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'placeholder')
  .setKey(process.env.APPWRITE_API_KEY || 'placeholder')

export const databases = new Databases(client)
export const account = new Account(client)

export const DB_ID = 'talkingo_db'
export const COLLECTIONS = {
  USER_PREFERENCES: 'user_preferences',
  LANGUAGE_PROGRESS: 'language_progress',
} as const
