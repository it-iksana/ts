'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ChangePasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      // Self-service — this only ever changes the currently authenticated
      // user's own password, unlike the admin reset which uses a
      // different API entirely to change someone else's.
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        setSubmitting(false)
        return
      }
      setSuccess(true)
      setPassword('')
      setConfirm('')
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm bg-red-50 text-red-700 rounded-lg px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="text-sm bg-emerald-50 text-emerald-700 rounded-lg px-4 py-3">
          ✓ Password changed.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Confirm New Password
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand-blue text-white rounded-lg py-2 font-medium disabled:opacity-50"
      >
        {submitting ? 'Updating…' : 'Change Password'}
      </button>

      <button
        type="button"
        onClick={() => router.push('/profile')}
        className="w-full text-sm text-slate-500"
      >
        Back to My Profile
      </button>
    </form>
  )
}
