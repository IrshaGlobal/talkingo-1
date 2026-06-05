import { NextRequest, NextResponse } from 'next/server'
import { Client, Account, Users } from 'node-appwrite'

export async function POST(req: NextRequest) {
  try {
    const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || ''
    const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || ''
    const apiKey = process.env.APPWRITE_API_KEY || ''

    if (!endpoint || !projectId || !apiKey) {
      return NextResponse.json(
        {
          isAdmin: false,
          reason: 'Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID, and APPWRITE_API_KEY in .env.local.',
        },
        { status: 500 }
      )
    }

    let userId: string | null = null

    try {
      const body = await req.json()
      userId = body.userId ?? null
    } catch {
      // no body
    }

    if (!userId) {
      return NextResponse.json(
        { isAdmin: false, reason: 'No userId provided.' },
        { status: 400 }
      )
    }

    const adminClient = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey)

    const usersApi = new Users(adminClient)

    const fullUser = await usersApi.get(userId)
    const labels: string[] = fullUser.labels ?? []

    if (!labels.includes('admin')) {
      return NextResponse.json(
        {
          isAdmin: false,
          reason: `User ${fullUser.email} does not have the admin label.`,
        },
        { status: 403 }
      )
    }

    return NextResponse.json({
      isAdmin: true,
      user: { id: fullUser.$id, email: fullUser.email, name: fullUser.name, labels },
    })
  } catch (error: any) {
    console.error('[verify-admin] Error:', error?.message ?? error)
    return NextResponse.json(
      { isAdmin: false, reason: 'Server configuration error. Check your Appwrite API key and endpoint.' },
      { status: 500 }
    )
  }
}
