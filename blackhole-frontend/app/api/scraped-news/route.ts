import { NextResponse } from 'next/server'
import { getScrapedNews, upsertScrapedNews, deleteScrapedNews } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))

    const result = await getScrapedNews(page, limit)

    return NextResponse.json({
      success: true,
      data: result.articles,
      pagination: result.pagination
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    })
  } catch (error) {
    console.error('Failed to load articles:', error)
    return NextResponse.json({ success: false, message: 'Failed to load articles' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body || !body.url) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
    }

    const article = await upsertScrapedNews(body)
    return NextResponse.json({ success: true, data: article })
  } catch (error) {
    console.error('Failed to store article:', error)
    return NextResponse.json({ success: false, message: 'Failed to store article' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ success: false, message: 'Article ID required' }, { status: 400 })
    }

    const result = await deleteScrapedNews(id)
    if (!result.found) {
      return NextResponse.json({ success: false, message: 'Article not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: 'Article deleted' })
  } catch (error) {
    console.error('Failed to delete article:', error)
    return NextResponse.json({ success: false, message: 'Failed to delete article' }, { status: 500 })
  }
}
