/**
 * Supabase Auth is fundamentally email-based — there's no native "plain
 * username" mode. Employees never see or type an email anywhere; this is
 * the one place that translation happens, both when someone logs in and
 * when an admin creates a new employee account. Keeping it in one shared
 * function means the two can never drift out of sync with each other.
 */
export function employeeCodeToInternalEmail(employeeCode: string): string {
  const normalized = employeeCode.trim().toLowerCase()
  return `${normalized}@iksana.local`
}
