'use client'

import { useState } from 'react'
import { updateMyProfile } from './actions'

type Employee = {
  full_name: string | null
  address: string | null
  personal_email: string | null
}

export default function ProfileForm({ employee }: { employee: Employee }) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError('')
    setSuccess(false)
    setSubmitting(true)
    try {
      const result = await updateMyProfile(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm bg-red-50 text-red-700 rounded-lg px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="text-sm bg-emerald-50 text-emerald-700 rounded-lg px-4 py-3">
          ✓ Profile updated.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
        <input
          name="full_name"
          type="text"
          defaultValue={employee.full_name ?? ''}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
        <textarea
          name="address"
          defaultValue={employee.address ?? ''}
          rows={2}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          name="personal_email"
          type="email"
          defaultValue={employee.personal_email ?? ''}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-brand-blue text-white rounded-lg py-2 font-medium disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Save'}
      </button>
    </form>
  )
}
