import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getUserModel } from '@/models/User'
import { getAuthDb } from '@/lib/mongodb'
import mongoose from 'mongoose'

// PasswordReset schema (inline, uses auth DB)
const passwordResetSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'password_resets' }
)

async function getPasswordResetModel() {
  const conn = await getAuthDb()
  return conn.models.PasswordReset || conn.model('PasswordReset', passwordResetSchema)
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const User = await getUserModel()
    const user = await User.findOne({ email: email.toLowerCase().trim() })

    if (!user) {
      // Don't reveal whether the email exists
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    const PasswordReset = await getPasswordResetModel()
    await PasswordReset.create({
      token: resetToken,
      userId: user._id,
      expiresAt,
    })

    // In production, send email with reset link
    // For now, log the token
    console.log(`📧 Password reset token for ${email}: ${resetToken}`)

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
