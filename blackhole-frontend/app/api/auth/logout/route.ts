import { NextRequest, NextResponse } from 'next/server'

const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://ai-being-ecwj.onrender.com'

/**
 * Proxy POST /api/auth/logout → external microservice (fire-and-forget).
 * The microservice is stateless; real cleanup is done client-side.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (token) {
    // Best-effort notify the microservice — don't await
    fetch(`${AUTH_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }).catch(() => {
      // Intentionally ignored
    })
  }

  return NextResponse.json({
    success: true,
    message: 'Logged out successfully. Clear authToken on the client side.',
  })
}
