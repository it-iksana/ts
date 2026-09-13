'use client'

import { useState } from 'react'
import { createHoliday } from './actions'

export default function NewHolidayForm() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError('')
    setSuccess(false)
    setSubmitting(true)
    try {
      const result = await createHoliday(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setSuccess(true)
        const form = document.getElementById('new-holiday-form') as HTMLFormElement | null
        form?.reset()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form id="new-holiday-form" action={handleSubmit} className="space-y-3">
      {error && (
        <div className="text-sm bg-red-50 text-red-700 rounded-lg px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="text-sm bg-emerald-50 text-emerald-700 rounded-lg px-4 py-3">
          ✓ Holiday added.
        </div>
      )}
      <div className="flex gap-3 items-end">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            name="holiday_date"
            type="date"
            required
            className="border border-slate-300 rounded-lg px-3 py-2 text-ink"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
          <input
            name="name"
            type="text"
            required
            placeholder="e.g. Independence Day"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-brand-blue text-white rounded-lg px-5 py-2.5 font-medium disabled:opacity-50 whitespace-nowrap"
        >
          {submitting ? 'Adding…' : 'Add Holiday'}
        </button>
      </div>
    </form>
  )
}
