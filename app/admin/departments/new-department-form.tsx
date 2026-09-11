'use client'

import { useState } from 'react'
import { createDepartment } from './actions'

export default function NewDepartmentForm() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError('')
    setSuccess(false)
    setSubmitting(true)
    try {
      const result = await createDepartment(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setSuccess(true)
        const form = document.getElementById('new-department-form') as HTMLFormElement | null
        form?.reset()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form id="new-department-form" action={handleSubmit} className="space-y-3">
      {error && (
        <div className="text-sm bg-red-50 text-red-700 rounded-lg px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="text-sm bg-emerald-50 text-emerald-700 rounded-lg px-4 py-3">
          ✓ Department added.
        </div>
      )}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Department Name
          </label>
          <input
            name="name"
            type="text"
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-brand-blue text-white rounded-lg px-5 py-2.5 font-medium disabled:opacity-50 whitespace-nowrap"
        >
          {submitting ? 'Adding…' : 'Add Department'}
        </button>
      </div>
    </form>
  )
}
