import { NextResponse } from 'next/server'

// Email verification can be implemented with a token-based flow similar to password reset.
// For now, this is a stub — verification is handled when users click the link in their email.

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Email verification is not yet configured. Users are active upon registration.',
  })
}
