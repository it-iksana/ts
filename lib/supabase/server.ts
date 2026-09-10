import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase connection — reads/writes the session via cookies,
 * so a logged-in user stays logged in across server-rendered pages and
 * middleware, not just in the browser tab that logged in.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll is called from a Server Component sometimes, where
            // cookies can't be written — safe to ignore here, since
            // middleware (below) is what actually refreshes the session.
          }
        },
      },
    }
  )
}
