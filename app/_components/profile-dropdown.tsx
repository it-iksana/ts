'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ProfileDropdown({ initial }: { initial: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch {
      // Sign-out failing shouldn't trap someone on the page — send them to
      // login regardless; if a session genuinely remains, middleware will
      // just bounce them back here next request.
    }
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-medium hover:bg-slate-300"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-10">
          <button
            onClick={handleSignOut}
            className="block w-full text-left px-4 py-2 text-sm text-ink hover:bg-paper"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
