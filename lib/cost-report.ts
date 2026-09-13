import ExcelJS from 'exceljs'
import { SupabaseClient } from '@supabase/supabase-js'

export function countWorkingDays(
  monthStart: string,
  monthEnd: string,
  holidayDates: Set<string> = new Set()
): number {
  // Mon–Fri, minus any date in holidayDates.
  let count = 0
  const d = new Date(monthStart + 'T00:00:00Z')
  const end = new Date(monthEnd + 'T00:00:00Z')
  while (d <= end) {
    const day = d.getUTCDay()
    const iso = d.toISOString().slice(0, 10)
    if (day !== 0 && day !== 6 && !holidayDates.has(iso)) count++
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

export type CostReportDetailRow = {
  employee: string
  department: string
  project: string
  date: string
  dayFraction: number
  cost: number
}

export type CostReport = {
  monthStart: string
  monthEnd: string
  workingDays: number
  holidayCount: number
  totalCost: number
  byProject: CostReportRow[]
  byDepartment: CostReportRow[]
  byEmployee: CostReportRow[]
  detail: CostReportDetailRow[]
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

  const holidaysRes = await supabase
    .from('holidays')
    .select('holiday_date')
    .gte('holiday_date', monthStart)
    .lte('holiday_date', monthEnd)
  const holidayDates = new Set((holidaysRes.data ?? []).map((h) => h.holiday_date))
  const workingDays = countWorkingDays(monthStart, monthEnd, holidayDates)

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
      .select('employee_id, project_id, entry_date, day_fraction, projects(name)')
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
  const detail: CostReportDetailRow[] = []

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

    detail.push({
      employee: employeeLabel,
      department: deptName,
      project: projectName,
      date: entry.entry_date,
      dayFraction: Number(entry.day_fraction),
      cost,
    })
  }

  detail.sort((a, b) => a.date.localeCompare(b.date) || a.employee.localeCompare(b.employee))

  const toRows = (map: Map<string, number>): CostReportRow[] =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).map(([label, cost]) => ({ label, cost }))

  const totalCost = [...costByProject.values()].reduce((a, b) => a + b, 0)

  return {
    monthStart,
    monthEnd,
    workingDays,
    holidayCount: holidayDates.size,
    totalCost,
    byProject: toRows(costByProject),
    byDepartment: toRows(costByDepartment),
    byEmployee: toRows(costByEmployee),
    detail,
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

export type ReportType = 'project' | 'department' | 'employee' | 'detail'

/**
 * Builds one focused .xlsx workbook — a single summary sheet for
 * 'project' / 'department' / 'employee', or one detailed row-level sheet
 * (every entry, unaggregated) for 'detail'. Separated from
 * computeCostReport() so this can be tested directly against known data,
 * independent of needing a real database session.
 */
export function buildCostReportWorkbook(report: CostReport, type: ReportType): ExcelJS.Workbook {
  const monthLabel = formatMonthLabel(report.monthStart)
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'iKSANA Timesheet'
  workbook.created = new Date()

  const currencyFormat = '₹#,##0;(₹#,##0)'

  function addNotes(sheet: ExcelJS.Worksheet, startRow: number) {
    let row = startRow
    if (report.missingRateCount > 0) {
      sheet.getCell(`A${row}`).value =
        `${report.missingRateCount} employee(s) logged time this month with no cost rate on file — excluded from this report.`
      sheet.getCell(`A${row}`).font = { italic: true, size: 9, color: { argb: 'FF888888' } }
      row++
    }
    sheet.getCell(`A${row}`).value =
      `Working days: ${report.workingDays} (Mon–Fri, minus ${report.holidayCount} holiday(s) this month).`
    sheet.getCell(`A${row}`).font = { italic: true, size: 9, color: { argb: 'FF888888' } }
  }

  function addSummarySheet(name: string, columnHeader: string, rows: CostReportRow[]) {
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

    const totalRowNum = rowNum
    sheet.getCell(`A${totalRowNum}`).value = 'Total'
    sheet.getCell(`B${totalRowNum}`).value = {
      formula: rows.length > 0 ? `SUM(B3:B${totalRowNum - 1})` : '0',
    }
    sheet.getRow(totalRowNum).font = { bold: true }
    sheet.getColumn('B').numFmt = currencyFormat

    addNotes(sheet, totalRowNum + 2)
  }

  function addDetailSheet() {
    const sheet = workbook.addWorksheet('All Data')

    sheet.mergeCells('A1:F1')
    sheet.getCell('A1').value = `All Data — ${monthLabel}`
    sheet.getRow(1).font = { bold: true, size: 13 }

    const headers = ['Date', 'Employee', 'Department', 'Project', 'Day Fraction', 'Cost']
    headers.forEach((h, i) => {
      sheet.getCell(2, i + 1).value = h
    })
    sheet.getRow(2).font = { bold: true }
    sheet.getColumn(1).width = 12
    sheet.getColumn(2).width = 24
    sheet.getColumn(3).width = 20
    sheet.getColumn(4).width = 28
    sheet.getColumn(5).width = 12
    sheet.getColumn(6).width = 16

    let rowNum = 3
    for (const row of report.detail) {
      sheet.getCell(rowNum, 1).value = row.date
      sheet.getCell(rowNum, 2).value = row.employee
      sheet.getCell(rowNum, 3).value = row.department
      sheet.getCell(rowNum, 4).value = row.project
      sheet.getCell(rowNum, 5).value = row.dayFraction
      sheet.getCell(rowNum, 6).value = row.cost
      rowNum++
    }

    const totalRowNum = rowNum
    sheet.getCell(totalRowNum, 4).value = 'Total'
    sheet.getCell(totalRowNum, 4).font = { bold: true }
    sheet.getCell(totalRowNum, 6).value = {
      formula: report.detail.length > 0 ? `SUM(F3:F${totalRowNum - 1})` : '0',
    }
    sheet.getRow(totalRowNum).font = { bold: true }
    sheet.getColumn(6).numFmt = currencyFormat

    addNotes(sheet, totalRowNum + 2)
  }

  if (type === 'project') addSummarySheet('By Project', 'Project', report.byProject)
  else if (type === 'department') addSummarySheet('By Department', 'Department', report.byDepartment)
  else if (type === 'employee') addSummarySheet('By Employee', 'Employee', report.byEmployee)
  else addDetailSheet()

  return workbook
}
