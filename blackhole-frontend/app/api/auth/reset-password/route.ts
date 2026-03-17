import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUserModel } from '@/models/User'
import { getAuthDb } from '@/lib/mongodb'
import mongoose from 'mongoose'

// Reuse the PasswordReset model
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
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Token and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const PasswordReset = await getPasswordResetModel()
    const resetRecord = await PasswordReset.findOne({
      token,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    })

    if (!resetRecord) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      )
    }

    // Update user password
    const User = await getUserModel()
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    await User.findByIdAndUpdate(resetRecord.userId, {
      password: hashedPassword,
      updated_at: new Date(),
    })

    // Mark token as used
    resetRecord.usedAt = new Date()
    await resetRecord.save()

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    })
  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
