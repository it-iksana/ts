'use client'

import { useEffect, useState } from 'react'

type Status = 'checking' | 'connected' | 'error'

/**
 * A genuine network reachability check — not supabase.auth.getSession(),
 * which reads from local storage first and can resolve successfully
 * without ever making a network call at all, especially with nobody
 * logged in (the normal case for this page). That could show "connected"
 * even if Supabase were completely unreachable.
 *
 * This makes a direct request to Supabase's REST endpoint instead. Any
 * HTTP response at all — even an error status — proves the network path
 * genuinely works, since we got a real reply from a real server. Only an
 * actual fetch failure (DNS failure, connection refused, timeout) means
 * unreachable. No session, no user data, and no secret key are involved —
 * just the public URL and the already-public publishable key.
 */
export default function ConnectionStatus() {
  const [status, setStatus] = useState<Status>('checking')
  const [detail, setDetail] = useState<string>('')

  useEffect(() => {
    async function checkReachability() {
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL
        const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

        if (!url || !key) {
          throw new Error('NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set.')
        }

        // GET to the REST root — HEAD triggers a CORS preflight that
        // Supabase's server doesn't answer for that method; GET is what
        // the real SDK uses and is properly supported. We only care that
        // a real HTTP response comes back, not what it actually contains.
        await fetch(`${url}/rest/v1/`, {
          method: 'GET',
          headers: { apikey: key },
        })

        setStatus('connected')
      } catch (err) {
        setStatus('error')
        setDetail(err instanceof Error ? err.message : String(err))
      }
    }

    checkReachability()
  }, [])

  if (status === 'checking') {
    return <p className="text-sm text-slate-400">Checking whether Supabase is reachable…</p>
  }

  if (status === 'error') {
    return (
      <div className="text-sm bg-red-50 text-red-700 rounded-md px-4 py-3 text-left">
        <p className="font-semibold mb-1">Supabase is not reachable</p>
        <p className="text-red-600">{detail}</p>
        <p className="text-red-500 mt-2 text-xs">
          Check that NEXT_PUBLIC_SUPABASE_URL and
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set correctly in Vercel's
          project settings.
        </p>
      </div>
    )
  }

  return (
    <div className="text-sm bg-emerald-50 text-emerald-700 rounded-md px-4 py-3 font-medium">
      ✓ Supabase server responded — network path is working
    </div>
  )
}
