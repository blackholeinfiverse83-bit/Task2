import { NextRequest, NextResponse } from 'next/server'
import { getAuthDb, getNewsDb } from '@/lib/mongodb'
import { getUserModel } from '@/models/User'

// This endpoint checks MongoDB connectivity for both databases

export async function POST(request: NextRequest) {
  try {
    // Verify both MongoDB connections
    const authConn = await getAuthDb()
    const newsConn = await getNewsDb()

    return NextResponse.json({
      success: true,
      message: 'MongoDB databases are connected and ready!',
      databases: {
        auth: authConn.readyState === 1 ? 'connected' : 'disconnected',
        news: newsConn.readyState === 1 ? 'connected' : 'disconnected',
      },
    })
  } catch (error) {
    console.error('Database setup check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to connect to MongoDB',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const User = await getUserModel()
    const count = await User.countDocuments()

    return NextResponse.json({
      success: true,
      setup: true,
      message:
        count === 0
          ? 'MongoDB connected — no users yet'
          : `MongoDB connected — ${count} user(s) found`,
    })
  } catch (error) {
    return NextResponse.json({
      success: true,
      setup: false,
      message: 'MongoDB connection issue — check MONGODB_AUTH_URI configuration',
    })
  }
}
