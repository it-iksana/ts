'use client'

import { useState } from 'react'
import { createProject } from './actions'

export default function NewProjectForm() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isDetailed, setIsDetailed] = useState(false)

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
        setIsDetailed(false)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form id="new-project-form" action={handleSubmit} className="space-y-4">
      <input type="hidden" name="is_detailed" value={isDetailed ? 'on' : ''} />
      {error && (
        <div className="text-sm bg-red-50 text-red-700 rounded-lg px-4 py-3">{error}</div>
      )}
      {success && (
        <div className="text-sm bg-emerald-50 text-emerald-700 rounded-lg px-4 py-3">
          ✓ Project added.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
        <input
          name="name"
          type="text"
          required
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-ink"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          How should employees log time on this?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsDetailed(false)}
            className={`flex-1 text-left rounded-lg p-3 border transition-colors ${
              !isDetailed
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-blue'
            }`}
          >
            <p className="text-sm font-medium">Simple</p>
            <p className={`text-xs mt-0.5 ${!isDetailed ? 'text-white/80' : 'text-slate-400'}`}>
              Project and days only
            </p>
          </button>
          <button
            type="button"
            onClick={() => setIsDetailed(true)}
            className={`flex-1 text-left rounded-lg p-3 border transition-colors ${
              isDetailed
                ? 'bg-brand-blue text-white border-brand-blue'
                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-blue'
            }`}
          >
            <p className="text-sm font-medium">Detailed</p>
            <p className={`text-xs mt-0.5 ${isDetailed ? 'text-white/80' : 'text-slate-400'}`}>
              Also select a task
            </p>
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-brand-blue text-white rounded-lg px-5 py-2.5 font-medium disabled:opacity-50"
      >
        {submitting ? 'Adding…' : 'Add Project'}
      </button>
    </form>
  )
}
