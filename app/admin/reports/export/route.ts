import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeCostReport, buildCostReportWorkbook } from '@/lib/cost-report'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  // Route Handlers have no redirect()-based page guard to lean on — this
  // is the actual authorization check for this endpoint, same rule as
  // requireCostAdmin() uses, just returning a real HTTP status instead
  // of redirecting since there's no page to redirect to here.
  const { data: employee } = await supabase
    .from('employees')
    .select('role, is_active')
    .eq('id', user.id)
    .single()
  if (!employee || !employee.is_active || employee.role !== 'cost_admin') {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })
  }

  const monthStart =
    request.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7) + '-01'
  const report = await computeCostReport(supabase, monthStart)
  const workbook = buildCostReportWorkbook(report)
  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="cost-report-${monthStart}.xlsx"`,
    },
  })
}
