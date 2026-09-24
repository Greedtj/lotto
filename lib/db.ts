import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Server-only client with the secret key. RLS denies everything else, so this is the only way in.
 * SUPABASE_DB_SCHEMA=preview on Vercel Preview keeps test data out of the real `public` schema.
 */
export const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  db: { schema: process.env.SUPABASE_DB_SCHEMA || 'public' },
  auth: { persistSession: false, autoRefreshToken: false },
})
