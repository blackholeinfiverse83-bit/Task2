'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import BackendStatus from '@/components/BackendStatus'
import { checkBackendHealth, getSankalpFeed, type SankalpItem } from '@/lib/api'
import { getSavedNews, removeSavedNews, SavedNewsItem } from '@/lib/newsStorage'
import { Search, Filter, TrendingUp, Clock, Globe, Newspaper, Trash2, PlayCircle, X } from 'lucide-react'

interface NewsItem {
  id: string
  title: string
  description: string
  url: string
  source: string
  category: string
  imageUrl?: string
  publishedAt: string
  readTime?: string
  isScraped?: boolean
  // Sankalp integration fields
  script?: string
  tone?: string
  audio_path?: string
  priority_score?: number
  trend_score?: number
  audio_duration?: number
  relatedVideos?: Array<{
    title?: string
    url?: string
    thumbnail?: string
    duration?: string
    source?: string
  }>
}

export default function Home() {
  const router = useRouter()
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [newsItems, setNewsItems] = useState<NewsItem[]>([])
  const [activeVideo, setActiveVideo] = useState<{
    article: NewsItem
    video: NonNullable<NewsItem['relatedVideos']>[number]
  } | null>(null)

  useEffect(() => {
    checkBackend()
    loadNewsFeed()
    const interval = setInterval(checkBackend, 30000)

    // Listen for storage changes to refresh feed when new articles are added
    const handleStorageChange = () => {
      loadNewsFeed()
    }
    window.addEventListener('storage', handleStorageChange)

    // Listen for custom event when articles are saved in same tab
    const handleNewsSaved = (event?: CustomEvent) => {
      console.log('📰 News article saved event received:', event?.detail)
      loadNewsFeed()
    }
    window.addEventListener('newsArticleSaved', handleNewsSaved as EventListener)

    // Also listen for localStorage changes
    const handleStorageUpdate = () => {
      if (localStorage.getItem('newsFeedUpdated')) {
        console.log('📰 Storage update detected, refreshing feed')
        loadNewsFeed()
        localStorage.removeItem('newsFeedUpdated')
      }
    }
    window.addEventListener('storage', handleStorageUpdate)

    // Also check periodically for changes (in case same tab adds articles)
    const refreshInterval = setInterval(() => {
      loadNewsFeed()
    }, 3000)

    return () => {
      clearInterval(interval)
      clearInterval(refreshInterval)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('storage', handleStorageUpdate)
      window.removeEventListener('newsArticleSaved', handleNewsSaved as EventListener)
    }
  }, [])

  const checkBackend = async () => {
    try {
      const isHealthy = await checkBackendHealth()
      setBackendStatus(isHealthy ? 'online' : 'offline')
    } catch (error) {
      setBackendStatus('offline')
    }
  }

  const loadNewsFeed = async () => {
    // Try to load from Sankalp first
    let sankalpItems: NewsItem[] = []
    try {
      console.log('📰 Loading from Sankalp...')
      const sankalpFeed = await getSankalpFeed()
      sankalpItems = sankalpFeed.items.map((item: SankalpItem) => {
        const newsItem = {
          id: item.id || `item-${Date.now()}-${Math.random()}`,
          title: typeof item.title === 'string' ? item.title : (typeof item.script === 'string' ? item.script.substring(0, 100) : 'Untitled'),
          description: typeof item.script === 'string' ? item.script : (item.summary_medium || item.summary_short || ''),
          url: item.id || '', // Use id as URL since it's URL-based
          source: extractSourceFromUrl(item.id || ''),
          category: item.category || 'general',
          publishedAt: item.timestamp ? formatTimeAgo(item.timestamp) : 'Recently',
          readTime: item.audio_duration ? `${Math.ceil(item.audio_duration)}s audio` : undefined,
          // Sankalp fields
          script: typeof item.script === 'string' ? item.script : '',
          tone: typeof item.tone === 'string' ? item.tone : '',
          audio_path: typeof item.audio_path === 'string' ? item.audio_path : '',
          priority_score: typeof item.priority_score === 'number' ? item.priority_score : 0,
          trend_score: typeof item.trend_score === 'number' ? item.trend_score : 0,
          audio_duration: typeof item.audio_duration === 'number' ? item.audio_duration : 0,
          isScraped: false // Mark as from Sankalp
        }
        // Final safety check - ensure title and description are strings
        if (typeof newsItem.title !== 'string') newsItem.title = 'Untitled'
        if (typeof newsItem.description !== 'string') newsItem.description = ''
        return newsItem
      })
      console.log('✅ Sankalp feed loaded:', sankalpItems.length, 'items')
    } catch (error) {
      console.warn('⚠️ Failed to load Sankalp feed:', error)
    }

    // Load saved scraped articles from localStorage (fallback)
    const savedArticles = getSavedNews()
    console.log('📰 Loading saved articles:', {
      savedArticlesCount: savedArticles.length
    })
    const localScraped = mapSavedItemsToNews(savedArticles)

    let serverScraped: NewsItem[] = []
    try {
      const response = await fetch('/api/scraped-news')
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data?.data)) {
          serverScraped = mapSavedItemsToNews(data.data as SavedNewsItem[])
        }
      }
    } catch (error) {
      console.warn('Failed to load server-saved articles:', error)
    }

    // Merge: Sankalp items first (highest priority), then scraped
    const scrapedNews = mergeByUrl([...serverScraped, ...localScraped])
    const allNews = mergeByUrl([...sankalpItems, ...scrapedNews])

    console.log('📰 Total news loaded:', {
      sankalpCount: sankalpItems.length,
      scrapedCount: scrapedNews.length,
      totalCount: allNews.length
    })

    // Sample news items - in production, this would come from an API
    const sampleNews: NewsItem[] = [
      {
        id: '1',
        title: 'Breaking: Major AI Breakthrough in Natural Language Processing',
        description: 'Researchers announce significant advancement in AI language models, enabling more accurate and context-aware responses.',
        url: 'https://www.bbc.com/news/technology',
        source: 'BBC News',
        category: 'technology',
        imageUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
        publishedAt: '2 hours ago',
        readTime: '5 min read'
      },
      {
        id: '2',
        title: 'Global Climate Summit Reaches Historic Agreement',
        description: 'World leaders commit to ambitious new targets for carbon emission reductions by 2030.',
        url: 'https://www.reuters.com/sustainability/climate-energy/',
        source: 'Reuters',
        category: 'environment',
        imageUrl: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b3?w=800',
        publishedAt: '4 hours ago',
        readTime: '7 min read'
      },
      {
        id: '3',
        title: 'Tech Giants Announce Major Partnership in Quantum Computing',
        description: 'Leading technology companies join forces to accelerate quantum computing research and development.',
        url: 'https://www.theverge.com/tech',
        source: 'The Verge',
        category: 'technology',
        imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
        publishedAt: '6 hours ago',
        readTime: '4 min read'
      },
      {
        id: '4',
        title: 'Stock Markets Rally on Positive Economic Data',
        description: 'Major indices see significant gains following better-than-expected employment and inflation figures.',
        url: 'https://www.cnbc.com/world-markets/',
        source: 'CNBC',
        category: 'business',
        imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
        publishedAt: '8 hours ago',
        readTime: '6 min read'
      },
      {
        id: '5',
        title: 'New Study Reveals Health Benefits of Mediterranean Diet',
        description: 'Long-term research shows significant improvements in cardiovascular health and longevity.',
        url: 'https://www.theguardian.com/science',
        source: 'The Guardian',
        category: 'health',
        imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
        publishedAt: '10 hours ago',
        readTime: '5 min read'
      },
      {
        id: '6',
        title: 'Space Agency Announces Plans for Mars Mission',
        description: 'Ambitious new timeline set for crewed mission to Mars, with launch targeted for 2030.',
        url: 'https://www.space.com/news',
        source: 'Space.com',
        category: 'science',
        imageUrl: 'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=800',
        publishedAt: '12 hours ago',
        readTime: '8 min read'
      },
      {
        id: '7',
        title: 'Cybersecurity Alert: New Vulnerability Discovered',
        description: 'Security researchers identify critical flaw affecting millions of devices worldwide.',
        url: 'https://www.wired.com/category/security/',
        source: 'Wired',
        category: 'technology',
        imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
        publishedAt: '14 hours ago',
        readTime: '6 min read'
      },
      {
        id: '8',
        title: 'Entertainment Industry Embraces Virtual Reality',
        description: 'Major studios announce slate of VR experiences, signaling shift in entertainment consumption.',
        url: 'https://variety.com/v/digital/',
        source: 'Variety',
        category: 'entertainment',
        imageUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=800',
        publishedAt: '16 hours ago',
        readTime: '5 min read'
      },
      {
        id: '9',
        title: 'Electric Vehicle Sales Surge in Major Markets',
        description: 'Latest figures show record adoption rates as prices decline and charging infrastructure expands.',
        url: 'https://www.cnn.com/business/tech',
        source: 'CNN Business',
        category: 'business',
        imageUrl: 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800',
        publishedAt: '18 hours ago',
        readTime: '4 min read'
      },
      {
        id: '10',
        title: 'Breakthrough in Renewable Energy Storage Technology',
        description: 'Scientists develop new battery technology promising longer lifespan and faster charging.',
        url: 'https://www.scientificamerican.com/energy-sustainability/',
        source: 'Scientific American',
        category: 'science',
        imageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800',
        publishedAt: '20 hours ago',
        readTime: '7 min read'
      },
      {
        id: '11',
        title: 'Global Education Initiative Reaches 1 Million Students',
        description: 'International program providing free online education celebrates major milestone.',
        url: 'https://www.edweek.org/technology',
        source: 'Education Week',
        category: 'education',
        imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800',
        publishedAt: '22 hours ago',
        readTime: '5 min read'
      },
      {
        id: '12',
        title: 'Artificial Intelligence in Healthcare Shows Promise',
        description: 'AI diagnostic tools demonstrate accuracy comparable to experienced physicians in recent trials.',
        url: 'https://www.healthcareitnews.com/',
        source: 'Healthcare IT News',
        category: 'health',
        imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800',
        publishedAt: '1 day ago',
        readTime: '6 min read'
      }
    ]


    // If we have Sankalp items or scraped items, use them; otherwise use sample news as fallback
    const finalNews = allNews.length > 0 ? allNews : sampleNews

    // CRITICAL: Sanitize all items to ensure they have valid title and description
    const sanitizedNews = finalNews.map(item => ({
      ...item,
      id: item.id || `item-${Date.now()}-${Math.random()}`,
      title: String(item.title || 'Untitled'),
      description: String(item.description || ''),
      url: String(item.url || item.id || ''),
      category: String(item.category || 'general'),
      source: String(item.source || 'Unknown'),
      publishedAt: String(item.publishedAt || 'Recently'),
    }))

    setNewsItems(sanitizedNews)
  }

  const categories = [
    { id: 'all', name: 'All', icon: Globe },
    { id: 'technology', name: 'Technology', icon: TrendingUp },
    { id: 'business', name: 'Business', icon: Newspaper },
    { id: 'science', name: 'Science', icon: Clock },
    { id: 'health', name: 'Health', icon: Filter },
    { id: 'environment', name: 'Environment', icon: Globe },
    { id: 'entertainment', name: 'Entertainment', icon: Newspaper },
    { id: 'education', name: 'Education', icon: Clock }
  ]

  const filteredNews = newsItems.filter(item => {
    // Safety check: ensure item has required properties
    if (!item || typeof item !== 'object') return false

    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const title = String(item.title || '')
    const description = String(item.description || '')
    const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const handleAnalyzeArticle = (url: string) => {
    // Navigate to analyze page with the URL pre-filled
    router.push(`/analyze?url=${encodeURIComponent(url)}`)
  }

  const handleNewsCardClick = (news: NewsItem) => {
    if (news.isScraped && news.relatedVideos && news.relatedVideos.length > 0) {
      setActiveVideo({ article: news, video: news.relatedVideos[0] })
      return
    }
    handleAnalyzeArticle(news.url)
  }

  const handleRemoveArticle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Remove this article from your feed?')) {
      const updated = newsItems.filter(item => item.id !== id)
      setNewsItems(updated)

      // Also remove from localStorage if it's a scraped article
      if (newsItems.find(item => item.id === id)?.isScraped) {
        removeSavedNews(id)
        // Reload to ensure consistency
        loadNewsFeed()
      }
    }
  }

  // Sort news for "Popular" and "Hot" sections
  const sortedNews = [...filteredNews].sort((a, b) => (b.trend_score || 0) - (a.trend_score || 0))
  const hotNews = sortedNews.slice(0, 1) // Top 1 for main feature
  const popularNews = sortedNews.slice(1, 6) // Next 5 for sidebar
  const remainingNews = sortedNews.slice(6) // Rest for standard grid

  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-accent-yellow selection:text-ink">
      {/* Vintage Header */}
      <header className="border-b-4 border-ink bg-paper sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row justify-between items-center border-b border-ink/20 pb-3 mb-3">
            <div className="text-sm font-serif italic">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <div className="flex items-center space-x-4 text-sm font-bold tracking-wider uppercase">
              <span className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${backendStatus === 'online' ? 'bg-green-600' : 'bg-red-600'}`}></div>
                System: {backendStatus}
              </span>
              <span className="hidden md:inline">|</span>
              <span>Vol. {new Date().getFullYear()}.{new Date().getMonth() + 1}</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-end relative">
            <nav className="hidden md:flex space-x-6 font-serif font-bold text-lg mb-2">
              <a href="#" className="hover:underline decoration-2 underline-offset-4">Home</a>
              <a href="#" className="hover:underline decoration-2 underline-offset-4">Reviews</a>
              <a href="#" className="hover:underline decoration-2 underline-offset-4">Daily News</a>
              <a href="#" className="hover:underline decoration-2 underline-offset-4">Features</a>
            </nav>

            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <h1 className="text-6xl md:text-8xl font-serif font-black tracking-tighter leading-none">
                Lo.News
              </h1>
              <p className="text-xs font-bold tracking-[0.3em] uppercase mt-1 border-t border-b border-ink py-1">
                The Daily Chronicle
              </p>
            </div>

            <button className="mb-2 px-6 py-2 bg-ink text-paper font-bold hover:bg-accent-red transition-colors border-2 border-transparent hover:border-ink">
              Contact Us
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="border-b-4 border-ink mb-12 pb-2">
          <h2 className="text-7xl md:text-9xl font-serif font-bold text-center leading-none tracking-tight">
            TODAY NEWS
          </h2>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col md:flex-row gap-6 mb-12 border-y-2 border-ink py-6 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-ink/50 w-5 h-5" />
            <input
              type="text"
              placeholder="Search the archives..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-transparent border-2 border-ink rounded-none text-ink placeholder-ink/50 focus:outline-none focus:bg-white/50 transition-all font-serif"
            />
          </div>
          <div className="flex overflow-x-auto gap-2 w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 border-2 border-ink font-bold whitespace-nowrap transition-all ${selectedCategory === category.id
                    ? 'bg-ink text-paper shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transform -translate-y-1'
                    : 'hover:bg-ink/10'
                  }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">

          {/* Left Column: Popular News (Sidebar) */}
          <div className="lg:col-span-4 space-y-8">
            <div className="border-b-4 border-ink pb-2 mb-6">
              <h3 className="text-3xl font-serif font-bold uppercase">Popular News</h3>
            </div>

            <div className="flex flex-col divide-y-2 divide-ink/20">
              {popularNews.map((news, index) => (
                <article
                  key={news.id}
                  className="py-6 group cursor-pointer"
                  onClick={() => handleNewsCardClick(news)}
                >
                  <div className="flex items-start gap-4">
                    <span className="text-4xl font-serif font-bold text-ink/20 group-hover:text-accent-red transition-colors">
                      0{index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider">
                        <span className="bg-ink text-paper px-2 py-0.5">{news.category}</span>
                        <span className="text-ink/60">{news.source}</span>
                      </div>
                      <h4 className="text-xl font-serif font-bold leading-tight mb-2 group-hover:underline decoration-2 underline-offset-2">
                        {news.title}
                      </h4>
                      <p className="text-sm text-ink/70 line-clamp-2 font-medium">
                        {news.description}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Ad / Banner Placeholder */}
            <div className="border-4 border-ink p-4 bg-accent-yellow/20 text-center">
              <p className="font-serif font-bold italic text-ink/60">Advertisement</p>
              <div className="h-32 flex items-center justify-center border-2 border-dashed border-ink/40 mt-2">
                <span className="font-bold">YOUR AD HERE</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hot News (Main Feature) */}
          <div className="lg:col-span-8">
            <div className="border-b-4 border-ink pb-2 mb-6 flex justify-between items-end">
              <h3 className="text-3xl font-serif font-bold uppercase">Hot News</h3>
              <span className="text-sm font-bold uppercase tracking-widest text-accent-red animate-pulse">
                Breaking Stories
              </span>
            </div>

            {/* Featured Article */}
            {hotNews.map((news) => (
              <article
                key={news.id}
                className="mb-12 cursor-pointer group"
                onClick={() => handleNewsCardClick(news)}
              >
                <div className="relative border-4 border-ink shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-6 overflow-hidden">
                  <div className="absolute top-4 left-4 z-10">
                    <span className="bg-accent-red text-white px-4 py-1 font-bold uppercase tracking-wider text-sm border-2 border-ink shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      Featured
                    </span>
                  </div>
                  {news.imageUrl ? (
                    <img
                      src={news.imageUrl}
                      alt={news.title}
                      className="w-full h-[400px] object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                    />
                  ) : (
                    <div className="w-full h-[400px] bg-ink/5 flex items-center justify-center">
                      <Newspaper className="w-24 h-24 text-ink/20" />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 text-sm font-bold uppercase tracking-wider border-b-2 border-ink/10 pb-4">
                    <span className="text-accent-red">{news.source}</span>
                    <span>•</span>
                    <span>{news.publishedAt}</span>
                    <span>•</span>
                    <span>{news.readTime}</span>
                  </div>
                  <h2 className="text-4xl md:text-5xl font-serif font-bold leading-tight group-hover:text-accent-red transition-colors">
                    {news.title}
                  </h2>
                  <p className="text-xl text-ink/80 font-serif leading-relaxed">
                    {news.description}
                  </p>
                  <div className="flex items-center gap-4 pt-4">
                    <button className="px-8 py-3 bg-ink text-paper font-bold hover:bg-accent-red transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
                      Read Full Story
                    </button>
                    {news.audio_path && (
                      <button className="px-6 py-3 border-2 border-ink font-bold hover:bg-ink hover:text-paper transition-colors flex items-center gap-2">
                        <PlayCircle className="w-5 h-5" /> Listen
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}

            {/* Secondary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t-4 border-ink pt-8">
              {remainingNews.map((news) => (
                <article
                  key={news.id}
                  className="group cursor-pointer flex flex-col h-full"
                  onClick={() => handleNewsCardClick(news)}
                >
                  <div className="border-2 border-ink mb-4 overflow-hidden relative h-48">
                    {news.imageUrl ? (
                      <img
                        src={news.imageUrl}
                        alt={news.title}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-ink/5 flex items-center justify-center">
                        <Newspaper className="w-12 h-12 text-ink/20" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 bg-ink text-paper px-3 py-1 text-xs font-bold uppercase">
                      {news.category}
                    </div>
                  </div>
                  <h3 className="text-xl font-serif font-bold leading-tight mb-3 group-hover:underline decoration-2 underline-offset-2 flex-grow">
                    {news.title}
                  </h3>
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-ink/60 mt-auto">
                    <span>{news.source}</span>
                    <span>{news.publishedAt}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Stats (Vintage Style) */}
        <div className="mt-20 border-t-4 border-ink pt-8 pb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center font-serif">
            <div className="border-r-2 border-ink/20 last:border-0">
              <div className="text-4xl font-bold mb-2">{newsItems.length}</div>
              <div className="text-sm uppercase tracking-widest font-bold">Articles</div>
            </div>
            <div className="border-r-2 border-ink/20 last:border-0">
              <div className="text-4xl font-bold mb-2">{newsItems.filter(item => item.isScraped).length}</div>
              <div className="text-sm uppercase tracking-widest font-bold">Scraped</div>
            </div>
            <div className="border-r-2 border-ink/20 last:border-0">
              <div className="text-4xl font-bold mb-2">{categories.length - 1}</div>
              <div className="text-sm uppercase tracking-widest font-bold">Sections</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">24/7</div>
              <div className="text-sm uppercase tracking-widest font-bold">Coverage</div>
            </div>
          </div>
          <div className="text-center mt-12 text-sm font-bold opacity-60">
            &copy; {new Date().getFullYear()} Blackhole Infiverse LLP. All Rights Reserved.
          </div>
        </div>
      </main>

      {/* Video Modal (Vintage Style) */}
      {activeVideo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 backdrop-blur-sm p-4">
          <div className="bg-paper w-full max-w-4xl border-4 border-paper shadow-[20px_20px_0px_0px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between border-b-4 border-ink px-6 py-4 bg-ink text-paper">
              <div>
                <p className="text-xs uppercase tracking-widest font-bold text-accent-yellow">Cinema Scope</p>
                <h3 className="text-xl font-serif font-bold">{activeVideo.article.title}</h3>
              </div>
              <button
                className="p-2 hover:bg-paper hover:text-ink transition-colors border-2 border-transparent hover:border-paper rounded-full"
                onClick={() => setActiveVideo(null)}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="relative w-full pb-[56.25%] border-4 border-ink bg-black">
                {getVideoEmbedUrl(activeVideo.video.url) ? (
                  <iframe
                    src={getVideoEmbedUrl(activeVideo.video.url)!}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={activeVideo.video.title || 'Related video'}
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white space-y-4">
                    <p className="text-center px-6 font-serif">
                      Reel unavailable for embedding.
                    </p>
                    <a
                      href={activeVideo.video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2 bg-accent-red text-white font-bold hover:bg-red-600 transition-colors"
                    >
                      View External Reel
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getVideoEmbedUrl(url?: string) {
  if (!url) return null
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/)
  if (youtubeMatch) {
    return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`
  }
  return null
}

function extractSourceFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname
    const source = hostname
      .replace(/^www\./, '')
      .split('.')
      .slice(0, -1)
      .join(' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    return source || 'Unknown Source'
  } catch {
    return 'Unknown Source'
  }
}

function formatTimeAgo(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`

    return date.toLocaleDateString()
  } catch {
    return 'Recently'
  }
}

function mapSavedItemsToNews(items: any[]): NewsItem[] {
  return items.map(item => ({
    id: item.id || `item-${Date.now()}-${Math.random()}`,
    title: typeof item.title === 'string' ? item.title : (item.script?.substring(0, 100) || 'Untitled'),
    description: typeof item.script === 'string' ? item.script :
      (typeof item.description === 'string' ? item.description :
        (typeof item.description === 'object' && (item.description as any)?.text) ? (item.description as any).text :
          'No description available'),
    url: String(item.url || item.id || ''), // Use id as URL fallback, ensure it's a string
    source: typeof item.source === 'string' ? item.source : extractSourceFromUrl(String(item.id || '')),
    category: typeof item.category === 'string' ? item.category : 'general',
    imageUrl: item.imageUrl,
    publishedAt: typeof item.publishedAt === 'string' ? item.publishedAt : 'Recently',
    readTime: item.audio_duration ? `${Math.ceil(item.audio_duration)}s audio` : (typeof item.readTime === 'string' ? item.readTime : undefined),
    isScraped: true,
    // Sankalp fields
    script: typeof item.script === 'string' ? item.script : '',
    tone: typeof item.tone === 'string' ? item.tone : '',
    audio_path: typeof item.audio_path === 'string' ? item.audio_path : '',
    priority_score: typeof item.priority_score === 'number' ? item.priority_score : 0,
    trend_score: typeof item.trend_score === 'number' ? item.trend_score : 0,
    audio_duration: typeof item.audio_duration === 'number' ? item.audio_duration : 0,
    relatedVideos: item.relatedVideos
  }))
}

function mergeByUrl(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>()
  const merged: NewsItem[] = []
  for (const item of items) {
    const key = item.url || item.id
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(item)
    }
  }
  return merged
}