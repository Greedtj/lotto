import 'server-only'
import { createClient } from '@supabase/supabase-js'

/** Server-only client with the secret key. RLS denies everything else, so this is the only way in. */
export const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
})
