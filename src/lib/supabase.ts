import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types

export type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
}

export type Document = {
  id: string
  user_id: string
  name: string
  cloudinary_url: string
  public_id: string
  status: 'unread' | 'reading' | 'finished'
  last_page: number
  total_pages: number
  created_at: string
  categories?: Category[]
}

export type Category = {
  id: string
  user_id: string
  name: string
  color: string
  created_at: string
  documents?: Document[]
}

export type DocumentCategory = {
  doc_id: string
  category_id: string
}

export type HighlightStyle = 'highlight' | 'underline'

export type Highlight = {
  id: string
  user_id: string
  doc_id: string
  page_number: number
  text: string
  color: string
  style: HighlightStyle        // highlight or underline
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  created_at: string
}

export type Tag = {
  id: string
  user_id: string
  name: string                 // whatever the user typed
  color: string
  created_at: string
}

export type Note = {
  id: string
  user_id: string
  doc_id: string
  highlight_id: string | null  // optional — thought notes have no highlight
  tag_id: string | null        // optional — highlights don't need a tag
  tag?: Tag                    // joined tag object when fetched
  content: string
  type: 'thought' | 'tagged'
  created_at: string
}

export type Canvas = {
  id: string
  user_id: string
  doc_id: string
  title: string | null
  content: Record<string, unknown>  // TipTap JSON — images live here
  cover_image: string | null
  created_at: string
  updated_at: string
}