'use client'

import { useState } from 'react'
import { createEmployee } from './actions'

type Department = { id: number; name: string }

export default function NewEmployeeForm({ departments }: { departments: Department[] }) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(formData: FormData) {
    setError('')
    setSuccess(false)
    setSubmitting(true)

    try {
      const result = await createEmployee(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setSuccess(true)
        // Reset the form's actual input elements — React doesn't do this
        // automatically for an uncontrolled form like this one.
        const form = document.getElementById('new-employee-form') as HTMLFormElement | null
        form?.reset()
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form id="new-employee-form" action={handleSubmit} className="space-y-4">
      {error && (
        <div className="text-sm bg-red-50 text-red-700 rounded-md px-4 py-3">
          {error}
        </div>
      )}
      {success && (
        <div className="text-sm bg-emerald-50 text-emerald-700 rounded-md px-4 py-3">
          ✓ Employee added.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Employee Code
          </label>
          <input
            name="employee_code"
            type="text"
            required
            placeholder="e.g. EMP004"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Full Name
          </label>
          <input
            name="full_name"
            type="text"
            required
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Temporary Password
        </label>
        <input
          name="password"
          type="text"
          required
          minLength={8}
          placeholder="At least 8 characters — share this with them directly"
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Role
          </label>
          <select
            name="role"
            defaultValue="employee"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
          >
            <option value="employee">Employee</option>
            <option value="tl_dc">TL / DC</option>
            <option value="cost_admin">Cost Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Department
          </label>
          <select
            name="department_id"
            defaultValue=""
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
          >
            <option value="">— None yet —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Date of Joining
          </label>
          <input
            name="date_of_joining"
            type="date"
            required
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-slate-900"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-sky-700 text-white rounded-md px-4 py-2 font-medium disabled:opacity-50"
      >
        {submitting ? 'Adding…' : 'Add Employee'}
      </button>
    </form>
  )
}
