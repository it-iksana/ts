'use client'

import { useEffect, useRef, useState } from 'react'
import { Menu as MenuIcon } from 'lucide-react'

export default function MenuDropdown({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center text-ink hover:text-brand-blue"
        aria-label="Menu"
      >
        <MenuIcon className="w-5 h-5" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-10">
          <p className="px-4 py-2 text-sm font-semibold text-brand-blue border-b border-slate-100 mb-2">
            iKSANA
          </p>
          <a href="/" className="block px-4 py-2 text-sm text-ink hover:bg-paper">
            Dashboard
          </a>
          <a href="/timesheet" className="block px-4 py-2 text-sm text-ink hover:bg-paper">
            Log Time
          </a>
          {isAdmin && (
            <>
              <div className="border-t border-slate-100 my-2" />
              <p className="px-4 py-1 text-xs font-medium text-slate-400">Administration</p>
              <a
                href="/admin/projects"
                className="block px-4 py-2 text-sm text-ink hover:bg-paper"
              >
                Projects & Tasks
              </a>
              <a
                href="/admin/employees"
                className="block px-4 py-2 text-sm text-ink hover:bg-paper"
              >
                Employees
              </a>
              <a
                href="/admin/departments"
                className="block px-4 py-2 text-sm text-ink hover:bg-paper"
              >
                Departments
              </a>
            </>
          )}
        </div>
      )}
    </div>
  )
}
