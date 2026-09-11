'use client'

import { useState } from 'react'
import { addLeaveEntry } from './actions'

const DURATION_OPTIONS = [
  { value: 0.5, label: 'Half day' },
  { value: 1, label: 'Full day' },
]

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
        <div className="text-sm bg-red-50 text-red-700 rounded-md px-4 py-3">{error}</div>
      )}
      <div className="grid grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Leave type</label>
          <select
            name="leave_type"
            required
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
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
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-amber-700 text-white rounded-md px-4 py-2 font-medium disabled:opacity-50"
        >
          {submitting ? 'Adding…' : 'Mark leave'}
        </button>
      </div>
    </form>
  )
}
