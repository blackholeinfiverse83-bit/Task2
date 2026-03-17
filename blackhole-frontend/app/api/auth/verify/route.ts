import { NextRequest, NextResponse } from 'next/server'

const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://ai-being-ecwj.onrender.com'

/**
 * Proxy GET /api/auth/verify → external microservice GET /api/auth/me
 * Translates the microservice response to the legacy shape
 * ({ success: true, data: { user } }) for backwards compatibility.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'No token provided' },
        { status: 401 }
      )
    }

    const res = await fetch(`${AUTH_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.message || data.error || 'Invalid or expired session' },
        { status: 401 }
      )
    }

    const user = data.user || data
    return NextResponse.json({
      success: true,
      data: { user },
    })
  } catch (error) {
    console.error('Verify proxy error:', error)
    return NextResponse.json(
      { success: false, error: 'Invalid or expired session' },
      { status: 401 }
    )
  }
}
