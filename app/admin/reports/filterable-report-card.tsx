'use client'

import { useState } from 'react'

type Row = { label: string; cost: number }

export default function FilterableReportCard({
  title,
  monthStart,
  type,
  rows,
}: {
  title: string
  monthStart: string
  type: 'project' | 'department' | 'employee'
  rows: Row[]
}) {
  const [query, setQuery] = useState('')

  const matches =
    query.trim() === ''
      ? []
      : rows.filter((r) => r.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)

  const placeholder = title.replace('By ', '').toLowerCase()

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-ink mb-3">{title}</h2>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-400">No data for this month.</p>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${placeholder}…`}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-ink mb-2"
          />

          {query.trim() !== '' && (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {matches.length > 0 ? (
                matches.map((row) => (
                  <a
                    key={row.label}
                    href={`/admin/reports/export?month=${monthStart}&type=${type}&filter=${encodeURIComponent(row.label)}`}
                    className="flex items-center justify-between text-sm px-2 py-1.5 -mx-2 rounded-lg hover:bg-paper transition-colors"
                  >
                    <span className="text-ink truncate pr-2">{row.label}</span>
                    <span className="text-slate-600 whitespace-nowrap">
                      ₹{row.cost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </a>
                ))
              ) : (
                <p className="text-sm text-slate-400">No matches.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
