import ExcelJS from 'exceljs'
import { SupabaseClient } from '@supabase/supabase-js'

export function countWorkingDays(monthStart: string, monthEnd: string): number {
  // Mon–Fri only. No holiday calendar exists yet, so this doesn't
  // account for holidays — a known, deliberate simplification, not an
  // oversight. Flagged clearly wherever this is shown.
  let count = 0
  const d = new Date(monthStart + 'T00:00:00Z')
  const end = new Date(monthEnd + 'T00:00:00Z')
  while (d <= end) {
    const day = d.getUTCDay()
    if (day !== 0 && day !== 6) count++
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return count
}

export function monthBounds(monthStart: string) {
  const monthEndDate = new Date(monthStart + 'T00:00:00Z')
  monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1)
  monthEndDate.setUTCDate(0)
  return monthEndDate.toISOString().slice(0, 10)
}

export type CostReportRow = { label: string; cost: number }

export type CostReport = {
  monthStart: string
  monthEnd: string
  workingDays: number
  totalCost: number
  byProject: CostReportRow[]
  byDepartment: CostReportRow[]
  byEmployee: CostReportRow[]
  missingRateCount: number
}

/**
 * The one place this calculation happens — both the report page and the
 * Excel export call this, so they can never quietly drift into showing
 * different numbers for the same month.
 */
export async function computeCostReport(
  supabase: SupabaseClient,
  monthStart: string
): Promise<CostReport> {
  const monthEnd = monthBounds(monthStart)
  const workingDays = countWorkingDays(monthStart, monthEnd)

  const [employeesRes, ratesRes, entriesRes] = await Promise.all([
    supabase
      .from('employees')
      .select('id, full_name, employee_code, department_id, departments(name)'),
    supabase
      .from('employee_cost_rates')
      .select('employee_id, monthly_cost, effective_from')
      .lte('effective_from', monthEnd)
      .order('effective_from', { ascending: true }),
    supabase
      .from('timesheet_entries')
      .select('employee_id, project_id, day_fraction, projects(name)')
      .gte('entry_date', monthStart)
      .lte('entry_date', monthEnd),
  ])

  const employees = employeesRes.data ?? []
  const entries = entriesRes.data ?? []

  const rateByEmployee = new Map<string, number>()
  for (const r of ratesRes.data ?? []) {
    rateByEmployee.set(r.employee_id, Number(r.monthly_cost))
  }

  const employeeById = new Map(employees.map((e) => [e.id, e]))

  const costByProject = new Map<string, number>()
  const costByDepartment = new Map<string, number>()
  const costByEmployee = new Map<string, number>()
  const missingRateFor = new Set<string>()

  for (const entry of entries) {
    const rate = rateByEmployee.get(entry.employee_id)
    if (rate === undefined) {
      missingRateFor.add(entry.employee_id)
      continue
    }
    const dailyRate = rate / workingDays
    const cost = dailyRate * Number(entry.day_fraction)

    const projectName =
      (entry.projects as unknown as { name: string } | null)?.name ?? 'Unknown project'
    costByProject.set(projectName, (costByProject.get(projectName) ?? 0) + cost)

    const employee = employeeById.get(entry.employee_id)
    const deptName =
      (employee?.departments as unknown as { name: string } | null)?.name ?? 'No department'
    costByDepartment.set(deptName, (costByDepartment.get(deptName) ?? 0) + cost)

    const employeeLabel = employee?.full_name ?? employee?.employee_code ?? entry.employee_id
    costByEmployee.set(employeeLabel, (costByEmployee.get(employeeLabel) ?? 0) + cost)
  }

  const toRows = (map: Map<string, number>): CostReportRow[] =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).map(([label, cost]) => ({ label, cost }))

  const totalCost = [...costByProject.values()].reduce((a, b) => a + b, 0)

  return {
    monthStart,
    monthEnd,
    workingDays,
    totalCost,
    byProject: toRows(costByProject),
    byDepartment: toRows(costByDepartment),
    byEmployee: toRows(costByEmployee),
    missingRateCount: missingRateFor.size,
  }
}

function formatMonthLabel(monthStart: string) {
  return new Date(monthStart + 'T00:00:00Z').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

/**
 * Builds the actual .xlsx workbook from an already-computed report.
 * Separated from computeCostReport() so this can be tested directly
 * against known data, independent of needing a real database session.
 */
export function buildCostReportWorkbook(report: CostReport): ExcelJS.Workbook {
  const monthLabel = formatMonthLabel(report.monthStart)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'iKSANA Timesheet'
  workbook.created = new Date()

  const currencyFormat = '₹#,##0;(₹#,##0)'

  function addSheet(name: string, columnHeader: string, rows: CostReportRow[]) {
    const sheet = workbook.addWorksheet(name)

    // Title row written first, so every row added after this lands at
    // its correct final position — no later insertRow() to shift
    // anything out from under an already-written formula.
    sheet.mergeCells('A1:B1')
    sheet.getCell('A1').value = `${name} — ${monthLabel}`
    sheet.getRow(1).font = { bold: true, size: 13 }

    sheet.getCell('A2').value = columnHeader
    sheet.getCell('B2').value = 'Cost'
    sheet.getRow(2).font = { bold: true }
    sheet.getColumn('A').width = 36
    sheet.getColumn('B').width = 18

    let rowNum = 3
    for (const row of rows) {
      sheet.getCell(`A${rowNum}`).value = row.label
      sheet.getCell(`B${rowNum}`).value = row.cost
      rowNum++
    }

    const firstDataRow = 3
    const lastDataRow = rowNum - 1
    const totalRowNum = rowNum
    sheet.getCell(`A${totalRowNum}`).value = 'Total'
    sheet.getCell(`B${totalRowNum}`).value = {
      formula: rows.length > 0 ? `SUM(B${firstDataRow}:B${lastDataRow})` : '0',
    }
    sheet.getRow(totalRowNum).font = { bold: true }

    sheet.getColumn('B').numFmt = currencyFormat

    let noteRow = totalRowNum + 2
    if (report.missingRateCount > 0) {
      sheet.getCell(`A${noteRow}`).value =
        `${report.missingRateCount} employee(s) logged time this month with no cost rate on file — excluded from this total.`
      sheet.getCell(`A${noteRow}`).font = { italic: true, size: 9, color: { argb: 'FF888888' } }
      noteRow++
    }
    sheet.getCell(`A${noteRow}`).value =
      `Working days: ${report.workingDays} (Mon–Fri only — no holiday calendar exists yet).`
    sheet.getCell(`A${noteRow}`).font = { italic: true, size: 9, color: { argb: 'FF888888' } }
  }

  addSheet('By Project', 'Project', report.byProject)
  addSheet('By Department', 'Department', report.byDepartment)
  addSheet('By Employee', 'Employee', report.byEmployee)

  return workbook
}
