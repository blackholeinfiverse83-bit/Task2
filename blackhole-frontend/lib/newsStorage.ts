export interface SavedNewsItem {
  id: string
  title: string
  description: string
  url: string
  source: string
  category: string
  imageUrl?: string
  publishedAt: string
  readTime?: string
  scrapedAt: string
  scrapedData?: any
  summary?: string
  insights?: any
  relatedVideos?: Array<{
    title?: string
    url?: string
    thumbnail?: string
    duration?: string
    source?: string
  }>
}

export function saveScrapedNews(scrapedData: any, url: string): SavedNewsItem | null {
  try {
    if (!scrapedData || !url) return null

    const title = scrapedData.title ||
      scrapedData.scraped_data?.title ||
      scrapedData.scraped_data?.metadata?.title ||
      scrapedData.scraped_data?.h1 ||
      extractTitleFromUrl(url) ||
      'No title found'

    const description = (typeof scrapedData.summary === 'string' ? scrapedData.summary : scrapedData.summary?.text) ||
      scrapedData.scraped_data?.content?.substring(0, 200) ||
      'No description available'

    const newsItem: SavedNewsItem = {
      id: `scraped_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      description: description.length > 200 ? description.substring(0, 200) + '...' : description,
      url,
      source: extractSourceFromUrl(url),
      category: detectCategory(title, description),
      imageUrl: findBestImage(scrapedData, title),
      publishedAt: formatTimeAgo(scrapedData.scraped_data?.date || new Date().toISOString()),
      readTime: Math.ceil((scrapedData.scraped_data?.content_length || description.length) / 1000) + ' min read',
      scrapedAt: new Date().toISOString(),
      scrapedData,
      summary: typeof scrapedData.summary === 'string' ? scrapedData.summary : (scrapedData.summary?.text || ''),
      insights: scrapedData.vetting_results,
      relatedVideos: extractRelatedVideos(scrapedData)
    }

    fetch('/api/scraped-news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newsItem)
    }).catch(error => console.error('Failed to save:', error))

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('newsArticleSaved', { detail: newsItem }))
    }

    return newsItem
  } catch (error) {
    console.error('Error saving:', error)
    return null
  }
}

export async function getSavedNews(): Promise<SavedNewsItem[]> {
  try {
    const response = await fetch('/api/scraped-news')
    const data = await response.json()
    return data.success ? data.data : []
  } catch {
    return []
  }
}

export async function removeSavedNews(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/scraped-news?id=${id}`, { method: 'DELETE' })
    const data = await response.json()
    return data.success
  } catch {
    return false
  }
}

function extractSourceFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace(/^www\./, '')
    return hostname.split('.').slice(0, -1).join(' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0)
    if (pathParts.length > 0) {
      return pathParts[pathParts.length - 1].replace(/[-_]/g, ' ').replace(/\.(html|htm|php)$/, '').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    }
    return urlObj.hostname.replace(/^www\./, '').charAt(0).toUpperCase() + urlObj.hostname.slice(1) + ' Homepage'
  } catch {
    return 'News Article'
  }
}

function detectCategory(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase()
  if (text.match(/\b(tech|ai|software|computer|digital)\b/)) return 'technology'
  if (text.match(/\b(business|economy|market|stock|finance)\b/)) return 'business'
  if (text.match(/\b(science|research|study|discovery)\b/)) return 'science'
  if (text.match(/\b(health|medical|doctor|hospital)\b/)) return 'health'
  if (text.match(/\b(climate|environment|green|carbon)\b/)) return 'environment'
  if (text.match(/\b(entertainment|movie|music|celebrity)\b/)) return 'entertainment'
  if (text.match(/\b(education|school|university|student)\b/)) return 'education'
  return 'general'
}

function formatTimeAgo(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`
    return date.toLocaleDateString()
  } catch {
    return 'Recently'
  }
}

function findBestImage(scrapedData: any, title: string): string | undefined {
  const candidates = [
    scrapedData.scraped_data?.images?.[0]?.url,
    scrapedData.scraped_data?.metadata?.image,
    scrapedData.scraped_data?.metadata?.ogImage,
    scrapedData.sidebar_videos?.videos?.[0]?.thumbnail,
  ]
  const valid = candidates.find(url => {
    if (!url || typeof url !== 'string') return false
    try {
      const u = new URL(url)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  })
  return valid || `https://source.unsplash.com/800x600/?news,${encodeURIComponent(title.split(' ').slice(0, 4).join(' '))}`
}

function extractRelatedVideos(scrapedData: any) {
  const videos = scrapedData.sidebar_videos?.videos || scrapedData.related_videos || []
  if (!Array.isArray(videos)) return undefined
  const mapped = videos.filter((v: any) => v && v.url).map((v: any) => ({
    title: v.title || 'Related Video',
    url: v.url,
    thumbnail: v.thumbnail,
    duration: v.duration,
    source: v.source
  }))
  return mapped.length ? mapped : undefined
}
