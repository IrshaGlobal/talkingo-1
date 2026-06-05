import { NextRequest, NextResponse } from 'next/server'
import { Client, Account, Users } from 'node-appwrite'

export async function verifyAdminAuth(req: NextRequest): Promise<{
  authorized: boolean
  error?: NextResponse
  userId?: string
}> {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ''
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''
  const apiKey = process.env.APPWRITE_API_KEY || ''

  if (!endpoint || !projectId || !apiKey) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      ),
    }
  }

  const authHeader = req.headers.get('authorization') || ''
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : ''

  if (!jwt) {
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }

  try {
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)

    ;(client as any).setJWT(jwt)

    const account = new Account(client)
    const userData = await account.get()

    const adminClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey)

    const usersApi = new Users(adminClient)
    const fullUser = await usersApi.get(userData.$id)
    const labels: string[] = fullUser.labels ?? []

    if (!labels.includes('admin')) {
      return {
        authorized: false,
        error: NextResponse.json({ error: 'Admin access required' }, { status: 403 }),
      }
    }

    return { authorized: true, userId: userData.$id }
  } catch {
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Authentication failed' }, { status: 401 }),
    }
  }
}
