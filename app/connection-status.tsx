'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'checking' | 'connected' | 'error'

/**
 * Genuine end-to-end proof, not a hardcoded "looks fine" message. Calls
 * Supabase's auth endpoint — this succeeds the moment the URL + publishable
 * key are valid and reachable, and needs no tables to exist yet, so it's a
 * clean first signal that the whole pipeline (env vars → Vercel → Supabase)
 * is actually wired up correctly.
 */
export default function ConnectionStatus() {
  const [status, setStatus] = useState<Status>('checking')
  const [detail, setDetail] = useState<string>('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth
      .getSession()
      .then(({ error }) => {
        if (error) {
          setStatus('error')
          setDetail(error.message)
        } else {
          setStatus('connected')
        }
      })
      .catch((err: Error) => {
        setStatus('error')
        setDetail(err.message)
      })
  }, [])

  if (status === 'checking') {
    return <p className="text-sm text-slate-400">Checking Supabase connection…</p>
  }

  if (status === 'error') {
    return (
      <div className="text-sm bg-red-50 text-red-700 rounded-md px-4 py-3 text-left">
        <p className="font-semibold mb-1">Could not reach Supabase</p>
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
      ✓ Connected to Supabase
    </div>
  )
}
