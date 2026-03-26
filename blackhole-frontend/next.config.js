/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,


  // Performance optimizations
  compress: true,

  async rewrites() {
    const backendBase = (process.env.NEXT_PUBLIC_NOOPUR_API_BASE || 'http://localhost:8000').replace(/\/+$/, '');
    return {
      // afterFiles: checked AFTER local Next.js API routes (e.g. /api/scraped-news, /api/auth/*)
      // This ensures local routes like /api/scraped-news are NOT proxied to the Python backend.
      afterFiles: [
        { source: '/api/scrape', destination: `${backendBase}/api/scrape` },
        { source: '/api/vet', destination: `${backendBase}/api/vet` },
        { source: '/api/summarize', destination: `${backendBase}/api/summarize` },
        { source: '/api/prompt', destination: `${backendBase}/api/prompt` },
        { source: '/api/video-search', destination: `${backendBase}/api/video-search` },
        { source: '/api/validate-video', destination: `${backendBase}/api/validate-video` },
        { source: '/api/unified-news-workflow', destination: `${backendBase}/api/unified-news-workflow` },
        { source: '/api/tts', destination: `${backendBase}/api/tts` },
        { source: '/api/bhiv/:path*', destination: `${backendBase}/api/bhiv/:path*` },
        { source: '/api/news/:path*', destination: `${backendBase}/api/news/:path*` },
        { source: '/api/feedback', destination: `${backendBase}/api/feedback` },
        { source: '/api/categories', destination: `${backendBase}/api/categories` },
        { source: '/api/audio/:path*', destination: `${backendBase}/api/audio/:path*` },
        { source: '/api/processed/:path*', destination: `${backendBase}/api/processed/:path*` },
        { source: '/api/system/:path*', destination: `${backendBase}/api/system/:path*` },
      ],
      fallback: [
        { source: '/health', destination: `${backendBase}/health` },
        { source: '/exports/:path*', destination: `${backendBase}/exports/:path*` },
        { source: '/data/:path*', destination: `${backendBase}/data/:path*` },
      ],
    }
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|gif|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*(js|css)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
