import { createBrowserClient } from '@supabase/ssr'

/**
 * Client-side Supabase connection. Uses the publishable key only — this is
 * deliberately the low-privilege key; every access rule is enforced by
 * Postgres Row Level Security policies, not by anything in this file. See
 * the RLS trigger + policies in /supabase/migrations.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
