import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

// Retry helper for database operations
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 500
): Promise<T> {
  let lastError: Error | undefined
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // Only retry on connection pool errors
      if (
        error instanceof Error && 
        (error.message.includes('connection pool') || 
         error.message.includes('P2024') ||
         error.message.includes('Timed out'))
      ) {
        console.log(`Connection attempt ${attempt} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
        continue
      }
      
      // For other errors, throw immediately
      throw error
    }
  }
  
  throw lastError || new Error('Operation failed after retries')
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user with retry logic
    const user = await withRetry(async () => {
      return await prisma.user.findUnique({
        where: { email }
      })
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update last login with retry
    await withRetry(async () => {
      return await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      })
    })

    // Create session with retry
    const session = await withRetry(async () => {
      return await prisma.session.create({
        data: {
          token: uuidv4(),
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      })
    })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token: session.token
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    
    // Check if it's a connection pool error
    if (error instanceof Error && error.message.includes('connection pool')) {
      return NextResponse.json(
        { success: false, error: 'Database connection busy. Please try again in a moment.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
