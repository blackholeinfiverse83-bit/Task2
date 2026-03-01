import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables — Supabase client will not be available.')
}

// Client-side Supabase client (null if env vars missing)
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

// Server-side Supabase client (for API routes)
export const createServerClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) return null
  return createClient(supabaseUrl, supabaseAnonKey)
}

export type User = {
  id: string
  email: string
  name?: string
}

// Database types
export type NewsArticle = {
  id: string
  title: string
  description: string
  url: string
  source: string
  category: string
  image_url?: string
  published_at: string
  read_time?: string
  user_id: string
  scraped_data?: any
  summary?: string
  created_at: string
}

export type UserProfile = {
  id: string
  email: string
  name?: string
  created_at: string
  updated_at: string
}
