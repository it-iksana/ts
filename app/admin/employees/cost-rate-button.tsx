'use client'

import { useState } from 'react'
import { setEmployeeCostRate } from './actions'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function CostRateButton({
  employeeId,
  currentRate,
}: {
  employeeId: string
  currentRate: number | null
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSet() {
    setError('')
    setSubmitting(true)
    try {
      const result = await setEmployeeCostRate(employeeId, Number(amount), effectiveFrom)
      if (!result.success) {
        setError(result.error)
      } else {
        setSuccess(true)
        setAmount('')
        setOpen(false)
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-ink text-sm">
          {currentRate !== null ? `₹${currentRate.toLocaleString('en-IN')}` : '—'}
        </span>
        <button
          onClick={() => {
            setOpen(true)
            setSuccess(false)
          }}
          className="text-xs text-brand-blue hover:underline"
        >
          Set new rate
        </button>
        {success && <span className="text-xs text-brand-teal">✓ Updated</span>}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Monthly cost"
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 w-24 text-ink"
        />
        <input
          type="date"
          value={effectiveFrom}
          onChange={(e) => setEffectiveFrom(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-ink"
        />
        <button
          onClick={handleSet}
          disabled={submitting || !amount || Number(amount) < 0}
          className="text-xs bg-brand-blue text-white rounded-lg px-2 py-1 disabled:opacity-50"
        >
          {submitting ? '…' : 'Set'}
        </button>
        <button onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
