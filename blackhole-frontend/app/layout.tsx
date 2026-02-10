'use client'

import { Inter } from 'next/font/google'
import { usePathname } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth'
import ProtectedRoute from '@/components/ProtectedRoute'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// Metadata needs to be in a separate file or handled differently in 'use client'
// For now, we'll use a metadata export pattern compatible with Next.js 14

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { isLoading } = useAuth()
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/setup']
  const isPublicRoute = publicRoutes.some(route => pathname?.startsWith(route))
  
  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blackhole-950 via-blackhole-900 to-infiverse-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen">
      {isPublicRoute ? (
        children
      ) : (
        <ProtectedRoute>{children}</ProtectedRoute>
      )}
    </div>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>Blackhole Infiverse LLP - Advanced AI News Analysis</title>
        <meta name="description" content="Professional AI-powered news analysis platform with web scraping, authenticity vetting, and intelligent summarization." />
        <meta name="keywords" content="AI, News Analysis, Web Scraping, Authenticity Vetting, Summarization, Blackhole Infiverse" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-blackhole-950 via-blackhole-900 to-infiverse-950`}>
        <AuthProvider>
          <LayoutContent>
            {children}
          </LayoutContent>
        </AuthProvider>
      </body>
    </html>
  )
}
