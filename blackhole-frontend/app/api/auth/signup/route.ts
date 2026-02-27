import { NextRequest, NextResponse } from 'next/server'
import { withAuthPrisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { sendEmail, generateVerificationEmail } from '@/lib/email'

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

    // Check DATABASE_URL is set
    if (!process.env.DATABASE_URL && !process.env.AUTH_DATABASE_URL) {
      console.error('FATAL: DATABASE_URL and AUTH_DATABASE_URL are both missing from environment')
      return NextResponse.json(
        { success: false, error: 'Server configuration error - database not configured' },
        { status: 500 }
      )
    }

    const result = await withAuthPrisma(async (prisma) => {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({ where: { email } })
      if (existingUser) return { exists: true }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: name || email.split('@')[0],
          isEmailVerified: false
        }
      })

      // Generate verification token
      const verificationToken = uuidv4()
      await prisma.emailVerification.create({
        data: {
          token: verificationToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      })

      return { user, verificationToken }
    })

    if ('exists' in result && result.exists) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    const { user, verificationToken } = result as { user: any; verificationToken: string }

    // Send verification email (non-blocking — don't fail signup if email fails)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://news-ai-frontend-4rmh.onrender.com'
    const verificationLink = `${appUrl}/verify-email?token=${verificationToken}`
    sendEmail({
      to: email,
      subject: 'Verify your email - Blackhole Infiverse',
      html: generateVerificationEmail(user.name || email.split('@')[0], verificationLink)
    }).catch(err => console.error('Email send failed (non-fatal):', err))

    return NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        message: 'Account created! Please check your email to verify your account.'
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Signup error:', message)

    // Give useful error messages instead of generic 500
    if (message.includes('connection') || message.includes('P1001') || message.includes('P1002')) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed. Please try again.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', details: process.env.NODE_ENV !== 'production' ? message : undefined },
      { status: 500 }
    )
  }
}
