'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

const SESSION_DURATION_MS = 3 * 60 * 60 * 1000 // 3 hours

interface User {
  id: string
  email: string
  name?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// sessionStorage helpers — auto-clears when tab/browser closes
function getSession() {
  try {
    const token = sessionStorage.getItem('auth_token')
    const userStr = sessionStorage.getItem('auth_user')
    const expiresAt = sessionStorage.getItem('auth_expires_at')
    if (!token || !userStr || !expiresAt) return null
    if (Date.now() > parseInt(expiresAt)) {
      clearSession()
      return null
    }
    return { token, user: JSON.parse(userStr) as User }
  } catch { return null }
}

function saveSession(token: string, user: User) {
  try {
    sessionStorage.setItem('auth_token', token)
    sessionStorage.setItem('auth_user', JSON.stringify(user))
    sessionStorage.setItem('auth_expires_at', String(Date.now() + SESSION_DURATION_MS))
    // Also save for lib/security.ts to use when signing requests
    localStorage.setItem('jwt_token', token)
  } catch { }
}

function clearSession() {
  try {
    sessionStorage.removeItem('auth_token')
    sessionStorage.removeItem('auth_user')
    sessionStorage.removeItem('auth_expires_at')
    localStorage.removeItem('jwt_token')
  } catch { }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // On mount: restore session from sessionStorage if still valid
    const session = getSession()
    if (session) {
      setUser(session.user)
    }
    setIsLoading(false)

    // Auto-logout when tab becomes visible again after long time, or on focus
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const session = getSession()
        if (!session) {
          setUser(null)
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Periodic check every 60 seconds
    const interval = setInterval(() => {
      const session = getSession()
      if (!session) setUser(null)
    }, 60_000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
    }
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await response.json()
      if (data.success) {
        saveSession(data.data.token, data.data.user)
        setUser(data.data.user)
        return { success: true }
      }
      return { success: false, error: data.error || 'Login failed' }
    } catch {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const signup = async (email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      })
      const data = await response.json()
      if (data.success) {
        saveSession(data.data.token, data.data.user)
        setUser(data.data.user)
        return { success: true }
      }
      return { success: false, error: data.error || 'Signup failed' }
    } catch {
      return { success: false, error: 'An unexpected error occurred' }
    }
  }

  const logout = async () => {
    const session = getSession()
    if (session?.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: session.token })
        })
      } catch { }
    }
    clearSession()
    setUser(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
