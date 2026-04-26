import { createClient } from '@supabase/supabase-js'

// Default to the new Supabase project noted in repo docs so Vite builds
// still work in Render if env vars are missing.
const FALLBACK_URL = 'https://sqmiosfervzwrxjastdg.supabase.co'
const FALLBACK_KEY = 'sb_publishable_ttVwRkdR2rc0C5WLe24xGQ_UUIU9i9F'

const url = (import.meta.env.VITE_SUPABASE_URL as string) || FALLBACK_URL
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || FALLBACK_KEY

export const supabase = createClient(url, key)