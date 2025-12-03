import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(process.cwd(), '..', 'sankalp-insight-node', 'exports', 'sample_integration.json')
const MAX_ARTICLES = 100

async function ensureDataFile() {
  // For the backend export, we assume it exists or we don't create it to avoid messing up backend state
  // If it doesn't exist, we'll just return empty
  try {
    await fs.access(DATA_FILE)
  } catch {
    // If file doesn't exist, we might want to create it or just warn
    // For now, let's not auto-create a backend file from frontend
  }
}

async function readArticles() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    const parsed = JSON.parse(raw || '{}')
    return Array.isArray(parsed.items) ? parsed.items : []
  } catch (error) {
    console.warn('Failed to read articles from backend export:', error)
    return []
  }
}

async function writeArticles(articles: unknown[]) {
  // We'll preserve the structure { items: [...] }
  await ensureDataFile()
  await fs.writeFile(DATA_FILE, JSON.stringify({ items: articles }, null, 2), 'utf-8')
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

