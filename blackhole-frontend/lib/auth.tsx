'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import * as authApi from '@/services/authApi'
import { getStoredToken, setStoredToken, clearStoredToken } from '@/services/authApi'

interface User {
  id: string
  email: string
  name?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  getToken: () => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // On mount, restore session from stored authToken via microservice /api/auth/me
  useEffect(() => {
    let isMounted = true

    const restoreSession = async () => {
      console.log("[AUTH DEBUG] Starting session restore")
      const token = getStoredToken()
      console.log("[AUTH DEBUG] Token from storage:", token ? "Found" : "None")
      
      if (!token) {
        console.log("[AUTH DEBUG] No token, ending load state")
        if (isMounted) setIsLoading(false)
        return
      }

      try {
        console.log("[AUTH DEBUG] Attempting to fetch user with token")
        const authUser = await authApi.getMe(token)
        console.log("[AUTH DEBUG] Successfully fetched user:", authUser?.email)
        if (isMounted) setUser(authUser)
      } catch (err) {
        console.error("[AUTH DEBUG] Session restore failed:", err)
        console.log("[AUTH DEBUG] Clearing stored token due to failure")
        clearStoredToken()
        if (isMounted) setUser(null)
      } finally {
        console.log("[AUTH DEBUG] Setting isLoading to false")
        if (isMounted) setIsLoading(false)
      }
    }

    restoreSession()

    return () => {
      isMounted = false
    }
  }, [])

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null)
    try {
      const { token, user: authUser } = await authApi.login(email, password)
      setStoredToken(token)
      setUser(authUser)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password'
      setError(msg)
      return { success: false, error: msg }
    }
  }

  const signup = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null)
    try {
      const { token, user: authUser } = await authApi.signup(
        name || email.split('@')[0],
        email,
        password
      )
      setStoredToken(token)
      setUser(authUser)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signup failed'
      setError(msg)
      return { success: false, error: msg }
    }
  }

  const logout = async () => {
    const token = getStoredToken()
    if (token) {
      // Fire-and-forget to microservice, clears localStorage internally
      authApi.logout(token)
    } else {
      clearStoredToken()
    }
    setUser(null)
    setError(null)
    router.push('/login')
  }

  const resetPassword = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      return { success: data.success, error: data.error }
    } catch {
      return { success: false, error: 'Failed to send password reset request' }
    }
  }

  const getToken = (): string | null => {
    return getStoredToken()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        signup,
        logout,
        resetPassword,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
