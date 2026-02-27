import { NextRequest, NextResponse } from 'next/server'
import prisma, { withPrisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Use withPrisma to automatically manage connections in serverless
    const result = await withPrisma(async (db) => {
      // Find user
      const user = await db.user.findUnique({
        where: { email }
      })

      if (!user) {
        return { error: 'Invalid email or password', status: 401 }
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password)

      if (!isValidPassword) {
        return { error: 'Invalid email or password', status: 401 }
      }

      // Update last login
      await db.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })

      // Create session
      const session = await db.session.create({
        data: {
          token: uuidv4(),
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      })

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token: session.token
      }
    })

    if ('error' in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        user: result.user,
        token: result.token
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
