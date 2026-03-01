const API_BASE = process.env.NEXT_PUBLIC_NOOPUR_API_BASE || 'http://localhost:8000'
const SANKALP_API_BASE = process.env.NEXT_PUBLIC_SANKALP_API_BASE || 'http://localhost:8000'

export interface WorkflowResult {
  success: boolean
  data?: {
    url: string
    timestamp: string
    workflow_steps: string[]
    processing_time: {
      scraping: number
      vetting: number
      summarization: number
      prompt_generation: number
      video_search: number
    }
    scraped_data: {
      title: string
      content_length: number
      author: string
      date: string
    }
    vetting_results: {
      authenticity_score: number
      credibility_rating: string
      is_reliable: boolean
    }
    summary: {
      text: string
      original_length: number
      summary_length: number
      compression_ratio: number
    }
    video_prompt: {
      prompt: string
      for_video_creation: boolean
      based_on_summary: boolean
    }
    sidebar_videos: {
      videos: Array<{
        title: string
        url: string
        thumbnail?: string
        duration?: string
        source: string
      }>
      total_found: number
      ready_for_playback: boolean
    }
    total_processing_time: number
    workflow_complete: boolean
    steps_completed: number
  }
  message?: string
  timestamp?: string
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    })

    if (!response.ok) {
      return false
    }

    const data = await response.json()
    return data.status === 'healthy'
  } catch (error) {
    console.error('Backend health check failed:', error)
    return false
  }
}

/** Request TTS audio from backend (Vaani). Returns audio blob (mp3 or wav). */
export async function fetchTTSAudio(text: string, language = 'en'): Promise<Blob> {
  const response = await fetch(`${API_BASE}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    body: JSON.stringify({ text, language }),
  })
  if (!response.ok) {
    const err = await response.text()
    throw new Error(err || `TTS failed: ${response.status}`)
  }
  return response.blob()
}

export async function runUnifiedWorkflow(url: string): Promise<WorkflowResult> {
  try {
    console.log(`📡 Connecting to backend at: ${API_BASE}`)
    return await runLegacyWorkflow(url);
  } catch (error) {
    console.error('Unified workflow failed:', error)
    throw new Error(error instanceof Error ? error.message : 'Unknown error occurred')
  }
}

/**
 * Step 1 of the new workflow: Create a news item
 */
export async function initiateNewsAnalysis(url: string): Promise<string> {
  const response = await fetch(`${API_BASE}/api/news`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({
      title: "Analyzing News...",
      content: "Extracted from URL",
      sourceUrl: url,
      source: 'web'
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create news item: ${response.status}`)
  }

  const data = await response.json()
  return data.newsId || data.id
}

/**
 * Step 2 of the new workflow: Trigger processing
 */
export async function triggerPipeline(newsId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/bhiv/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ newsItemId: newsId }),
  })

  if (!response.ok) {
    throw new Error(`Pipeline execution failed: ${response.status}`)
  }

  return await response.json()
}

/**
 * Legacy workflow fallback for compatibility with Python-only backend
 */
async function runLegacyWorkflow(url: string): Promise<WorkflowResult> {
  const response = await fetch(`${API_BASE}/api/unified-news-workflow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

/**
 * Maps the new backend response (BHIV + Pipeline) to the Frontend WorkflowResult interface
 */
// NOTE: mapToWorkflowResult was removed — it was dead code with hardcoded fallback values.


export async function testIndividualTool(tool: string, payload: any): Promise<any> {
  try {
    const endpoints: { [key: string]: string } = {
      scraping: '/api/scrape',
      vetting: '/api/vet',
      summarization: '/api/summarize',
      prompt: '/api/prompt',
      video: '/api/video-search',
      'validate-video': '/api/validate-video',
      'bhiv-process': '/api/bhiv/process'
    }

    const endpoint = endpoints[tool]
    if (!endpoint) {
      throw new Error(`Unknown tool: ${tool}`)
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`${tool} tool test failed:`, error)
    throw error
  }
}

/**
 * Fetches the real-time pipeline status for a specific news item
 */
export async function getDetailedPipelineStatus(newsId: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE}/api/processed/${newsId}`)
    if (!response.ok) throw new Error('Status poll failed')
    return await response.json()
  } catch (error) {
    console.error('Pipeline status poll failed:', error)
    return null
  }
}

/**
 * Fetches a single news item by ID
 */
export async function getNewsItemById(newsId: string): Promise<any> {
  const response = await fetch(`${API_BASE}/api/news/${newsId}`)
  if (!response.ok) throw new Error('Failed to fetch news item')
  const result = await response.json()
  return result.data
}

/**
 * Fetches available news categories from the backend
 */
export async function getAvailableCategories(): Promise<{ categories: string[], counts: Record<string, number> }> {
  try {
    const response = await fetch(`${API_BASE}/api/categories`)
    if (!response.ok) throw new Error('Failed to fetch categories')
    const data = await response.json()
    return {
      categories: data.categories || [],
      counts: data.counts || {}
    }
  } catch (error) {
    console.error('Category fetch failed:', error)
    return { categories: [], counts: {} }
  }
}

/**
 * Checks for audio preview availability
 */
export async function getAudioAvailability(newsId: string): Promise<{ available: boolean, url: string | null }> {
  try {
    const response = await fetch(`${API_BASE}/api/audio/${newsId}`)
    if (!response.ok) throw new Error('Audio check failed')
    const data = await response.json()
    return {
      available: data.available,
      url: data.url
    }
  } catch (error) {
    console.error('Audio check failed:', error)
    return { available: false, url: null }
  }
}

export async function getBackendStatus(): Promise<{
  status: string
  services: { [key: string]: any }
  endpoints: number
  version: string
}> {
  try {
    const response = await fetch(`${API_BASE}/health`)
    if (!response.ok) {
      throw new Error('Backend not responding')
    }
    return await response.json()
  } catch (error) {
    throw new Error('Failed to get backend status')
  }
}


// ============================================================================
// Sankalp (Insight Node) API Integration
// ============================================================================

import { buildSecureHeaders } from './security'

export interface SankalpItem {
  id: string
  script: string
  tone: string
  language: string
  audio_path: string
  priority_score: number
  trend_score: number
  title?: string
  summary_short?: string
  summary_medium?: string
  category?: string
  polarity?: string
  timestamp?: string
  audio_duration?: number
  voice_used?: string
  synthesis_status?: string
  avatar?: string
}

export interface SankalpFeedResponse {
  generated_at?: string
  items: SankalpItem[]
}

export interface FeedbackSignals {
  editor_approve?: boolean
  user_like?: boolean
  user_skip?: boolean
  manual_override?: boolean
}

export interface FeedbackResponse {
  id: string
  reward: number
  action: string
  requeued: boolean
}

/**
 * Fetch news feed from Sankalp's weekly report
 * Note: This assumes Sankalp exposes the weekly_report.json via HTTP
 * If not, we'll need to integrate via Noopur or file system
 */
export async function getSankalpFeed(): Promise<SankalpFeedResponse> {
  try {
    // NOTE: Removed redundant checkBackendHealth() call here.
    // The caller (page.tsx loadNewsFeed) already checks backend availability.

    const url = `${SANKALP_API_BASE}/exports/weekly_report.json`
    const secureHeaders = await buildSecureHeaders(url, 'GET')
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...secureHeaders },
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (!response.ok) throw new Error('Not found')
      const data = await response.json()
      return { items: data?.items || [], generated_at: data?.generated_at }
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError instanceof Error && fetchError.name === 'AbortError') return { items: [] }

      const fallbackUrl = `${SANKALP_API_BASE}/exports/sample_integration.json`
      const fallbackHeaders = await buildSecureHeaders(fallbackUrl, 'GET')
      const fallbackController = new AbortController()
      const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 5000)
      try {
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', ...fallbackHeaders },
          signal: fallbackController.signal,
        })
        clearTimeout(fallbackTimeoutId)
        if (!fallbackResponse.ok) return { items: [] }
        const data = await fallbackResponse.json()
        return { items: data?.items || [] }
      } catch (e) {
        clearTimeout(fallbackTimeoutId)
        return { items: [] }
      }
    }
  } catch (error) {
    if (!(error as any).__logged) {
      console.warn('⚠️ Sankalp feed unavailable')
        ; (error as any).__logged = true
    }
    return { items: [] }
  }
}

/**
 * Submit feedback to the local orchestrator's feedback system
 */
export async function submitFeedback(
  itemId: string,
  item: Partial<SankalpItem>,
  signals: FeedbackSignals
): Promise<FeedbackResponse> {
  try {
    // Determine primary endpoint based on where the item came from
    // For news items processed by Noopur Node, we use its feedback router
    const feedbackUrl = `${API_BASE}/api/feedback`
    const feedbackType = signals.editor_approve ? 'approve' : (signals.user_like ? 'like' : (signals.user_skip ? 'skip' : 'view'))

    const response = await fetch(feedbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        newsId: itemId,
        feedbackType: feedbackType,
        metadata: {
          signals,
          title: item.title,
          timestamp: new Date()
        }
      }),
    })

    if (!response.ok) {
      // Fallback to Sankalp feedback if main orchestrator fails
      return await submitSankalpFeedback(itemId, item, signals)
    }

    const data = await response.json()
    return {
      id: itemId,
      reward: data.reward || 0,
      action: feedbackType,
      requeued: false
    }
  } catch (error) {
    console.error('Failed to submit feedback:', error)
    return await submitSankalpFeedback(itemId, item, signals)
  }
}

/**
 * Legacy/Microservice feedback fallback
 */
async function submitSankalpFeedback(
  itemId: string,
  item: Partial<SankalpItem>,
  signals: FeedbackSignals
): Promise<FeedbackResponse> {
  const url = `${SANKALP_API_BASE}/feedback`
  const body = {
    id: itemId,
    item: item,
    signals: signals,
  }
  const secureHeaders = await buildSecureHeaders(url, 'POST', body)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...secureHeaders,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}


/**
 * Requeue an item for reprocessing
 */
export async function requeueItem(itemId: string): Promise<{ id: string; requeued: boolean }> {
  try {
    const url = `${SANKALP_API_BASE}/requeue`
    const body = { id: itemId }
    const secureHeaders = await buildSecureHeaders(url, 'POST', body)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...secureHeaders,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to requeue item:', error)
    throw new Error(error instanceof Error ? error.message : 'Unknown error occurred')
  }
}

/**
 * Get audio URL from audio_path
 */
export function getAudioUrl(audioPath: string): string {
  if (!audioPath) return ''

  // If it's already a full URL, return as is
  if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
    return audioPath
  }

  // Construct URL based on the path structure
  // Sankalp paths usually start with 'data/audio/'
  if (audioPath.includes('data/audio')) {
    const audioBase = process.env.NEXT_PUBLIC_SANKALP_API_BASE || 'http://localhost:8000'
    const normalizedPath = audioPath.replace(/\\/g, '/')
    const cleanPath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath
    return `${audioBase}/${cleanPath}`
  }

  // Noopur paths or default fallback
  const audioBase = process.env.NEXT_PUBLIC_AUDIO_BASE_URL || API_BASE
  // Normalize path (replace backslashes with forward slashes)
  const normalizedPath = audioPath.replace(/\\/g, '/')
  // Remove leading slash if present to avoid double slashes
  const cleanPath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath

  return `${audioBase}/${cleanPath}`
}
