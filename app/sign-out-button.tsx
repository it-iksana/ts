'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutButton() {
  const router = useRouter()

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
    <button
      onClick={handleSignOut}
      className="text-sm text-slate-500 hover:text-slate-700"
    >
      Sign out
    </button>
  )
}
