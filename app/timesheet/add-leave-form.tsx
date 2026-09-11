'use client'

import { useState } from 'react'
import { addLeaveEntry } from './actions'

const LEAVE_TYPES = [
  { value: 'L', label: 'Leave' },
  { value: 'SL', label: 'Sick' },
  { value: 'CL', label: 'Casual' },
  { value: 'CO', label: 'Comp-off' },
]

const DURATIONS = [
  { value: 0.5, label: 'Half day' },
  { value: 1, label: 'Full day' },
]

export default function AddLeaveForm({ entryDate }: { entryDate: string }) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [leaveType, setLeaveType] = useState('L')
  const [duration, setDuration] = useState(1)

  async function handleSubmit(formData: FormData) {
    setError('')
    setSubmitting(true)
    try {
      const result = await addLeaveEntry(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setLeaveType('L')
        setDuration(1)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="entry_date" value={entryDate} />
      <input type="hidden" name="leave_type" value={leaveType} />
      <input type="hidden" name="duration" value={duration} />
      {error && (
        <div className="text-sm bg-red-50 text-red-700 rounded-lg px-4 py-3">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
        <div className="flex gap-2">
          {LEAVE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setLeaveType(t.value)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium border transition-colors ${
                leaveType === t.value
                  ? 'bg-brand-teal text-white border-brand-teal'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-teal'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Duration</label>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDuration(d.value)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium border transition-colors ${
                duration === d.value
                  ? 'bg-brand-teal text-white border-brand-teal'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-brand-teal'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-brand-teal text-white rounded-lg px-5 py-2.5 font-medium disabled:opacity-50"
      >
        {submitting ? 'Adding…' : 'Mark leave'}
      </button>
    </form>
  )
}
