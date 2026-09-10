'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { employeeCodeToInternalEmail } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [employeeCode, setEmployeeCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: employeeCodeToInternalEmail(employeeCode),
        password,
      })

      if (signInError) {
        // Supabase's real error mentions "email" — meaningless to someone
        // who only ever sees "Employee Code" on this screen, so it's
        // rephrased rather than shown verbatim.
        setError('Employee code or password is incorrect.')
        setLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong signing in. Please try again.'
      )
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <form
        onSubmit={handleSubmit}
        className="max-w-sm w-full bg-white rounded-xl shadow p-8"
      >
        <p className="text-sm font-semibold tracking-wide text-sky-700 uppercase mb-1 text-center">
          iKSANA
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">
          Timesheet
        </h1>

        {error && (
          <div className="text-sm bg-red-50 text-red-700 rounded-md px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <label className="block text-sm font-medium text-slate-700 mb-1">
          Employee Code
        </label>
        <input
          type="text"
          value={employeeCode}
          onChange={(e) => setEmployeeCode(e.target.value)}
          required
          autoFocus
          className="w-full border border-slate-300 rounded-md px-3 py-2 mb-4 text-slate-900"
          placeholder="e.g. EMP001"
        />

        <label className="block text-sm font-medium text-slate-700 mb-1">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border border-slate-300 rounded-md px-3 py-2 mb-6 text-slate-900"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-sky-700 text-white rounded-md py-2 font-medium disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </main>
  )
}
