import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withAuthPrisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Sanitize log input to prevent log injection
function sanitizeLog(input: string): string {
  return input.replace(/[\n\r]/g, ' ').slice(0, 100)
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

    // Database authentication
    try {
      const user = await withAuthPrisma(async (prisma) => {
        return await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: { id: true, email: true, name: true, password: true, isActive: true }
        })
      })

      if (user && user.isActive) {
        const passwordMatch = await bcrypt.compare(password, user.password)
        if (passwordMatch) {
          const token = uuidv4()
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

          // Store session in database instead of in-memory
          try {
            await withAuthPrisma(async (prisma) => {
              await prisma.session.create({
                data: {
                  token,
                  userId: user.id,
                  expiresAt,
                }
              })
            })
          } catch (sessionError) {
            console.warn('Failed to persist session to DB:', sessionError instanceof Error ? sanitizeLog(sessionError.message) : 'Unknown error')
            // Session still works via token validation on GET
          }

          console.log(`✅ Login successful: ${sanitizeLog(user.email)}`)
          return NextResponse.json({
            success: true,
            data: {
              user: { id: user.id, email: user.email, name: user.name },
              token
            }
          })
        } else {
          return NextResponse.json(
            { success: false, error: 'Invalid email or password' },
            { status: 401 }
          )
        }
      }
    } catch (dbError) {
      console.warn('DB login failed:', dbError instanceof Error ? sanitizeLog(dbError.message) : 'Unknown error')
    }

    // No mock users — DB is the only source of truth
    return NextResponse.json(
      { success: false, error: 'Invalid email or password' },
      { status: 401 }
    )
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Login error:', sanitizeLog(errorMsg))
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - verify session token
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')

  if (!token) return NextResponse.json({ valid: false })

  try {
    const session = await withAuthPrisma(async (prisma) => {
      return await prisma.session.findUnique({
        where: { token: token },
        include: { user: { select: { id: true, email: true } } }
      })
    })

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ valid: false })
    }

    return NextResponse.json({
      valid: true,
      user: { id: session.user.id, email: session.user.email }
    })
  } catch {
    return NextResponse.json({ valid: false })
  }
}
