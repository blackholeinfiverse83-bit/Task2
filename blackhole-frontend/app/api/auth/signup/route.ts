import { NextRequest, NextResponse } from 'next/server'

const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://ai-being-ecwj.onrender.com'

/**
 * Proxy POST /api/auth/signup → external microservice
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const res = await fetch(`${AUTH_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.message || data.error || 'Signup failed' },
        { status: res.status }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        token: data.token,
        user: data.user,
        message: 'Account created successfully!',
      },
    })
  } catch (error) {
    console.error('Signup proxy error:', error)
    return NextResponse.json(
      { success: false, error: 'Signup failed' },
      { status: 500 }
    )
  }
}
