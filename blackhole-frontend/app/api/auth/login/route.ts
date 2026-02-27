import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuthPrisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// In-memory session store (resets on server restart)
const activeSessions: Map<string, { userId: string; email: string; expiresAt: Date }> = new Map()

// Fallback mock users for local development
const MOCK_USERS = [
  { id: 'user-001', email: 'admin@example.com', name: 'Admin User', password: 'admin123' },
  { id: 'user-002', email: 'test@example.com', name: 'Test User', password: 'test123' },
]

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // 1. Try real Supabase DB first
    try {
      const result = await withAuthPrisma(async (prisma) => {
        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: { id: true, email: true, name: true, password: true, isActive: true }
        })
        return user
      })

      if (result && result.isActive) {
        const passwordMatch = await bcrypt.compare(password, result.password)
        if (passwordMatch) {
          const token = uuidv4()
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          activeSessions.set(token, { userId: result.id, email: result.email, expiresAt })
          console.log(`✅ DB login successful: ${result.email}`)
          return NextResponse.json({
            success: true,
            data: {
              user: { id: result.id, email: result.email, name: result.name },
              token
            }
          })
        } else {
          // User exists but wrong password — return 401 immediately
          return NextResponse.json(
            { success: false, error: 'Invalid email or password' },
            { status: 401 }
          )
        }
      }
      // User not found in DB — fall through to mock users
    } catch (dbError) {
      console.warn('DB login failed, trying mock users:', dbError instanceof Error ? dbError.message : dbError)
    }

    // 2. Fallback: mock users (plain text passwords for local dev)
    const mockUser = MOCK_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )

    if (!mockUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    activeSessions.set(token, { userId: mockUser.id, email: mockUser.email, expiresAt })
    console.log(`✅ Mock login successful: ${mockUser.email} (Session: ${token.slice(0, 8)}...)`)

    return NextResponse.json({
      success: true,
      data: {
        user: { id: mockUser.id, email: mockUser.email, name: mockUser.name },
        token
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - verify session token
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) return NextResponse.json({ valid: false })

  const session = activeSessions.get(token)
  if (!session || session.expiresAt < new Date()) return NextResponse.json({ valid: false })

  return NextResponse.json({
    valid: true,
    user: { id: session.userId, email: session.email }
  })
}
