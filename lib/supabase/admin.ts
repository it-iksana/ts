import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Uses the SECRET key, not the publishable one — this client bypasses Row
 * Level Security entirely and can perform admin-only operations like
 * creating a login for someone else. The 'server-only' import above makes
 * Next.js throw a build error if this file is ever accidentally imported
 * into client-side code, rather than silently shipping a secret key to
 * the browser.
 *
 * Only ever call this from Server Actions or Route Handlers — never from
 * a page that renders in the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
