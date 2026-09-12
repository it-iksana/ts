'use client'

import { useState } from 'react'
import { updateTaskStatus } from './actions'

type MyTask = {
  id: number
  name: string
  status: string
  projects: { name: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  done: 'Done',
}

export default function MyTasks({ tasks }: { tasks: MyTask[] }) {
  const [errors, setErrors] = useState<Record<number, string>>({})

  async function handleChange(taskId: number, status: string) {
    setErrors((prev) => ({ ...prev, [taskId]: '' }))
    try {
      const result = await updateTaskStatus(taskId, status)
      if (!result.success) {
        setErrors((prev) => ({ ...prev, [taskId]: result.error }))
      }
    } catch {
      setErrors((prev) => ({ ...prev, [taskId]: 'Something went wrong.' }))
    }
  }

  if (tasks.length === 0) return null

  return (
    <div className="mb-6">
      <p className="text-xs font-medium text-slate-400 mb-2">Assigned to you</p>
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <span className="text-ink">{t.name}</span>
              {t.projects && <span className="text-slate-500"> · {t.projects.name}</span>}
              {errors[t.id] && <p className="text-xs text-red-600 mt-1">{errors[t.id]}</p>}
            </div>
            <select
              defaultValue={t.status}
              onChange={(e) => handleChange(t.id, e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
