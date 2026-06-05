import { Client, Account } from 'appwrite'

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ''
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''

if (!endpoint || !projectId) {
  console.warn(
    'Appwrite credentials missing. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID in .env.local'
  )
}

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)

export const account = new Account(client)
