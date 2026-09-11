'use client'

import { useState } from 'react'
import { addLeaveEntry } from './actions'

export default function AddLeaveForm({ entryDate }: { entryDate: string }) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError('')
    setSubmitting(true)
    try {
      const result = await addLeaveEntry(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        const form = document.getElementById('add-leave-form') as HTMLFormElement | null
        form?.reset()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form id="add-leave-form" action={handleSubmit} className="space-y-3">
      <input type="hidden" name="entry_date" value={entryDate} />
      {error && (
        <div className="text-sm bg-red-50 text-red-700 rounded-lg px-4 py-3">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
        <select
          name="leave_type"
          required
          defaultValue="L"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink bg-white"
        >
          <option value="L">Leave</option>
          <option value="SL">Sick Leave</option>
          <option value="CL">Casual Leave</option>
          <option value="CO">Comp-off</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
        <select
          name="duration"
          required
          defaultValue="1"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink bg-white"
        >
          <option value="0.5">Half day</option>
          <option value="1">Full day</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-brand-teal text-white rounded-lg px-5 py-2.5 font-medium disabled:opacity-50 w-full"
      >
        {submitting ? 'Adding…' : 'Mark leave'}
      </button>
    </form>
  )
}
