const API_BASE = 'http://localhost:8000'
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

export async function runUnifiedWorkflow(url: string): Promise<WorkflowResult> {
  try {
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

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Unified workflow failed:', error)
    throw new Error(error instanceof Error ? error.message : 'Unknown error occurred')
  }
}

export async function testIndividualTool(tool: string, payload: any): Promise<any> {
  try {
    const endpoints: { [key: string]: string } = {
      scraping: '/api/scrape',
      vetting: '/api/vet',
      summarization: '/api/summarize',
      prompt: '/api/prompt',
      video: '/api/video-search',
      'validate-video': '/api/validate-video'
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
    // Try to fetch from weekly_report.json endpoint
    // If Sankalp doesn't expose this, we'll need to adjust
    const response = await fetch(`${SANKALP_API_BASE}/exports/weekly_report.json`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // Fallback: try sample_integration.json
      const fallbackResponse = await fetch(`${SANKALP_API_BASE}/exports/sample_integration.json`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!fallbackResponse.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await fallbackResponse.json()
      return { items: data.items || [] }
    }

    const data = await response.json()
    return { items: data.items || [], generated_at: data.generated_at }
  } catch (error) {
    console.error('Failed to fetch Sankalp feed:', error)
    // Return empty feed on error
    return { items: [] }
  }
}

/**
 * Submit feedback to Sankalp's reinforcement learning system
 */
export async function submitFeedback(
  itemId: string,
  item: Partial<SankalpItem>,
  signals: FeedbackSignals
): Promise<FeedbackResponse> {
  try {
    const response = await fetch(`${SANKALP_API_BASE}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: itemId,
        item: item,
        signals: signals,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to submit feedback:', error)
    throw new Error(error instanceof Error ? error.message : 'Unknown error occurred')
  }
}

/**
 * Requeue an item for reprocessing
 */
export async function requeueItem(itemId: string): Promise<{ id: string; requeued: boolean }> {
  try {
    const response = await fetch(`${SANKALP_API_BASE}/requeue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: itemId,
      }),
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
  
  // Otherwise, construct URL from base and path
  const audioBase = process.env.NEXT_PUBLIC_AUDIO_BASE_URL || SANKALP_API_BASE
  // Normalize path (replace backslashes with forward slashes)
  const normalizedPath = audioPath.replace(/\\/g, '/')
  // Remove leading slash if present to avoid double slashes
  const cleanPath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath
  
  return `${audioBase}/${cleanPath}`
}
