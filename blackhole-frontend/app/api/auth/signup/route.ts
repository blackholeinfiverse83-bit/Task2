import { NextRequest, NextResponse } from 'next/server'
import { withAuthPrisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

function sanitizeLog(input: string): string {
  return input.replace(/[\n\r]/g, ' ').slice(0, 100)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, name } = body

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Try database first
    try {
      const result = await withAuthPrisma(async (prisma) => {
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) return { exists: true }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            name: name || email.split('@')[0],
            isEmailVerified: false
          }
        })
        return { user }
      })

      if ('exists' in result && result.exists) {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists' },
          { status: 409 }
        )
      }

      const user = (result as any).user
      const token = uuidv4()
      console.log(`✅ DB signup successful: ${sanitizeLog(email)}`)
      return NextResponse.json({
        success: true,
        data: {
          user: { id: user.id, email: user.email, name: user.name },
          token,
          message: 'Account created successfully!'
        }
      })
    } catch (dbError) {
      console.warn('DB signup failed:', dbError instanceof Error ? sanitizeLog(dbError.message) : 'Unknown error')
      // Fall through to in-memory signup
    }

    return NextResponse.json(
      { success: false, error: 'Database signup failed' },
      { status: 500 }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Signup error:', sanitizeLog(message))
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
