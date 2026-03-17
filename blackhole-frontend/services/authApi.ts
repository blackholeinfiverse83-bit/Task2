/**
 * Auth API Service
 * Routes all auth calls through Next.js API proxy routes to avoid CORS issues.
 * Browser → /api/auth/* (same-origin) → external microservice (server-to-server)
 */

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
// All calls now go through same-origin Next.js API routes (no CORS issues)

/**
 * POST /api/auth/signup  (proxied server-side to external microservice)
 */
export async function signup(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Signup failed')
  }
  // Proxy returns { success, data: { token, user, message } }
  const payload = data.data || data
  return { token: payload.token, user: payload.user } as AuthResponse
}

/**
 * POST /api/auth/login  (proxied server-side to external microservice)
 */
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Invalid email or password')
  }
  // Proxy returns { success, data: { token, user } }
  const payload = data.data || data
  return { token: payload.token, user: payload.user } as AuthResponse
}

/**
 * GET /api/auth/verify  (proxied server-side to external GET /api/auth/me)
 * Restores the session from a stored JWT.
 */
export async function getMe(token: string): Promise<AuthUser> {
  const res = await fetch('/api/auth/verify', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || data.message || 'Session invalid')
  }
  // Proxy returns { success, data: { user } }
  const payload = data.data || data
  return (payload.user || payload) as AuthUser
}

/**
 * POST /api/auth/logout  (proxied server-side — fire-and-forget)
 * Clears the client token regardless of server response.
 */
export async function logout(token: string): Promise<void> {
  // Fire-and-forget; don't await or throw
  fetch('/api/auth/logout', {
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
