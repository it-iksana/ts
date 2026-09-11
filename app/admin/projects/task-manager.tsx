'use client'

import { useState } from 'react'
import { createTask } from './actions'

type Task = { id: number; name: string }

export default function TaskManager({
  projectId,
  tasks,
}: {
  projectId: number
  tasks: Task[]
}) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError('')
    setSubmitting(true)
    try {
      const result = await createTask(projectId, formData)
      if (!result.success) {
        setError(result.error)
      } else {
        const form = document.getElementById(
          `new-task-form-${projectId}`
        ) as HTMLFormElement | null
        form?.reset()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 pl-4 border-l-2 border-slate-100">
      <p className="text-xs font-medium text-slate-500 uppercase mb-2">Tasks</p>
      {tasks.length === 0 && (
        <p className="text-sm text-slate-400 mb-2">No tasks yet.</p>
      )}
      <ul className="text-sm text-slate-700 mb-3 space-y-1">
        {tasks.map((t) => (
          <li key={t.id}>• {t.name}</li>
        ))}
      </ul>

      {error && (
        <div className="text-xs bg-red-50 text-red-700 rounded-md px-3 py-2 mb-2">
          {error}
        </div>
      )}

      <form
        id={`new-task-form-${projectId}`}
        action={handleSubmit}
        className="flex gap-2"
      >
        <input
          name="name"
          type="text"
          required
          placeholder="New task name"
          className="flex-1 border border-slate-300 rounded-md px-3 py-1.5 text-sm text-slate-900"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-slate-700 text-white rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          {submitting ? 'Adding…' : 'Add'}
        </button>
      </form>
    </div>
  )
}
