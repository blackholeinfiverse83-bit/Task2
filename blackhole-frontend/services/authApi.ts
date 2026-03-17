/**
 * Auth API Service
 * Wraps all calls to the external JWT authentication microservice.
 * Base URL: process.env.NEXT_PUBLIC_AUTH_API_URL
 */

const AUTH_BASE_URL =
  process.env.NEXT_PUBLIC_AUTH_API_URL || 'https://ai-being-ecwj.onrender.com'

const AUTH_TOKEN_KEY = 'authToken'

// ---------- localStorage helpers ----------

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  let token = localStorage.getItem(AUTH_TOKEN_KEY)
  
  // Seamless migration for users with the old token key
  if (!token) {
    const oldToken = localStorage.getItem('jwt_token')
    if (oldToken) {
      token = oldToken
      localStorage.setItem(AUTH_TOKEN_KEY, oldToken)
      localStorage.removeItem('jwt_token')
      console.log('Migrated old jwt_token to new authToken format')
    }
  }
  
  return token
}

export function setStoredToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(AUTH_TOKEN_KEY)
  // Also clear any legacy key that may still exist
  localStorage.removeItem('jwt_token')
}

// ---------- API types ----------

export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

// ---------- API methods ----------

/**
 * POST /api/auth/signup
 */
export async function signup(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Signup failed')
  }
  return data as AuthResponse
}

/**
 * POST /api/auth/login
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Invalid email or password')
  }
  return data as AuthResponse
}

/**
 * GET /api/auth/me
 * Restores the session from a stored JWT.
 */
export async function getMe(token: string): Promise<AuthUser> {
  const res = await fetch(`${AUTH_BASE_URL}/api/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Session invalid')
  }
  // Microservice returns { user: { id, name, email } }
  return (data.user || data) as AuthUser
}

/**
 * POST /api/auth/logout
 * Fire-and-forget — clears the client token regardless of server response.
 */
export async function logout(token: string): Promise<void> {
  // Fire-and-forget; don't await or throw
  fetch(`${AUTH_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }).catch(() => {
    // Intentionally ignored — stateless logout
  })

  clearStoredToken()
}
