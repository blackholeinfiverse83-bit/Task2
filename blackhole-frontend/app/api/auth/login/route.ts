import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// LOCAL MOCK LOGIN - bypasses database issues
// Use this while database connections are stuck

interface MockUser {
  id: string
  email: string
  name: string
  password: string // In production, NEVER store plain text passwords
}

// Hardcoded users for local testing
const MOCK_USERS: MockUser[] = [
  {
    id: 'user-001',
    email: 'admin@example.com',
    name: 'Admin User',
    password: 'admin123'
  },
  {
    id: 'user-002', 
    email: 'test@example.com',
    name: 'Test User',
    password: 'test123'
  }
]

// In-memory session store (resets on server restart)
const activeSessions: Map<string, { userId: string; email: string; expiresAt: Date }> = new Map()

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user in mock database
    const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase())

    if (!user || user.password !== password) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Create session token
    const token = uuidv4()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Store session
    activeSessions.set(token, {
      userId: user.id,
      email: user.email,
      expiresAt
    })

    console.log(`✅ Local login successful: ${user.email} (Session: ${token.slice(0, 8)}...)`)

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token: token
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

// GET endpoint to verify session (optional - for token validation)
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return NextResponse.json({ valid: false })
  }

  const session = activeSessions.get(token)
  
  if (!session || session.expiresAt < new Date()) {
    return NextResponse.json({ valid: false })
  }

  return NextResponse.json({ 
    valid: true,
    user: {
      id: session.userId,
      email: session.email
    }
  })
}
