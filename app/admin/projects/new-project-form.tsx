'use client'

import { useState } from 'react'
import { createProject } from './actions'

export default function NewProjectForm() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError('')
    setSuccess(false)
    setSubmitting(true)
    try {
      const result = await createProject(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setSuccess(true)
        const form = document.getElementById('new-project-form') as HTMLFormElement | null
        form?.reset()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form id="new-project-form" action={handleSubmit} className="space-y-3">
      {error && (
        <div className="text-sm bg-red-50 text-red-700 rounded-md px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm bg-emerald-50 text-emerald-700 rounded-md px-4 py-3">
          ✓ Project added.
        </div>
      )}

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Project Name
          </label>
          <input
            name="name"
            type="text"
            required
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700 whitespace-nowrap">
          <input type="checkbox" name="is_detailed" className="rounded" />
          Detailed (task-level)
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="bg-sky-700 text-white rounded-md px-4 py-2 font-medium disabled:opacity-50 whitespace-nowrap"
        >
          {submitting ? 'Adding…' : 'Add Project'}
        </button>
      </div>
    </form>
  )
}
