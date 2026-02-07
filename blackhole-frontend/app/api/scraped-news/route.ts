import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(process.cwd(), 'data', 'news-articles.json')
const MAX_ARTICLES = 100

async function ensureDataFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf-8')
  }
}

async function readArticles() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : (parsed.items || [])
  } catch (error) {
    return []
  }
}

async function writeArticles(articles: unknown[]) {
  await ensureDataFile()
  const data = JSON.stringify(articles, null, 2)
  await fs.writeFile(DATA_FILE, data, 'utf-8')
}

export async function GET() {
  try {
    const data = await readArticles()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to load scraped articles' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (!body || !body.url) {
      return NextResponse.json({ success: false, message: 'Invalid payload' }, { status: 400 })
    }

    const articles = await readArticles()
    const filtered = articles.filter((article: any) => article.url !== body.url)
    filtered.unshift({ ...body, storedAt: new Date().toISOString() })
    const limited = filtered.slice(0, MAX_ARTICLES)
    await writeArticles(limited)

    return NextResponse.json({ success: true, data: limited[0] })
  } catch (error) {
    console.error('Failed to store scraped article:', error)
    return NextResponse.json({ success: false, message: 'Failed to store scraped article' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    console.log('🗑️ DELETE API called with id:', id)
    
    if (!id) {
      console.log('❌ No ID provided')
      return NextResponse.json({ success: false, message: 'Article ID required' }, { status: 400 })
    }

    console.log('📝 Reading articles from file...')
    const articles = await readArticles()
    console.log('📝 Total articles before delete:', articles.length)
    console.log('📝 Article IDs:', articles.map((a: any) => a.id))
    
    const filtered = articles.filter((article: any) => article.id !== id)
    console.log('📝 Total articles after filter:', filtered.length)
    console.log('📝 Deleted:', articles.length - filtered.length, 'articles')
    
    console.log('💾 Writing filtered articles back to file...')
    await writeArticles(filtered)
    console.log('✅ File write complete')

    return NextResponse.json({ success: true, message: 'Article deleted' })
  } catch (error) {
    console.error('❌ Failed to delete article:', error)
    return NextResponse.json({ success: false, message: 'Failed to delete article' }, { status: 500 })
  }
}

