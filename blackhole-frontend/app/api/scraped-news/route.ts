import { NextResponse } from 'next/server'
import { withNewsPrisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
  const skip = (page - 1) * limit

  return withNewsPrisma(async (prisma) => {
    const [articles, total] = await Promise.all([
      prisma.scrapedNews.findMany({
        select: {
          customId: true,
          title: true,
          description: true,
          url: true,
          source: true,
          category: true,
          imageUrl: true,
          publishedAt: true,
          readTime: true,
          relatedVideos: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.scrapedNews.count()
    ])
    return NextResponse.json({
      success: true,
      data: articles,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
      }
    })
  }).catch((error) => {
    console.error('Failed to load articles:', error)
    return NextResponse.json({ success: false, message: 'Failed to load articles' }, { status: 500 })
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body || !body.url) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
    }

    return withNewsPrisma(async (prisma) => {
      const article = await prisma.scrapedNews.upsert({
        where: { url: body.url },
        update: {
          title: body.title,
          description: body.description,
          source: body.source,
          category: body.category,
          imageUrl: body.imageUrl,
          publishedAt: body.publishedAt,
          readTime: body.readTime,
          scrapedAt: body.scrapedAt,
          scrapedData: body.scrapedData,
          summary: body.summary,
          insights: body.insights,
          relatedVideos: body.relatedVideos,
          storedAt: new Date().toISOString()
        },
        create: {
          customId: body.id,
          title: body.title,
          description: body.description,
          url: body.url,
          source: body.source,
          category: body.category,
          imageUrl: body.imageUrl,
          publishedAt: body.publishedAt,
          readTime: body.readTime,
          scrapedAt: body.scrapedAt,
          scrapedData: body.scrapedData,
          summary: body.summary,
          insights: body.insights,
          relatedVideos: body.relatedVideos,
          storedAt: new Date().toISOString()
        }
      })
      return NextResponse.json({ success: true, data: article })
    })
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

    return withNewsPrisma(async (prisma) => {
      try {
        await prisma.scrapedNews.delete({
          where: { customId: id }
        })
        return NextResponse.json({ success: true, message: 'Article deleted' })
      } catch (deleteError: any) {
        // Prisma P2025: Record not found
        if (deleteError?.code === 'P2025') {
          return NextResponse.json({ success: false, message: 'Article not found' }, { status: 404 })
        }
        throw deleteError
      }
    })
  } catch (error) {
    console.error('Failed to delete article:', error)
    return NextResponse.json({ success: false, message: 'Failed to delete article' }, { status: 500 })
  }
}
