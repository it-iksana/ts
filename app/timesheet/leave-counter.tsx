export default function LeaveCounter({
  monthTotal,
  yearTotal,
}: {
  monthTotal: number
  yearTotal: number
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-400 mb-3">Leave counter</p>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-500">Taken this month</p>
          <p className="text-lg font-semibold text-ink">{monthTotal.toFixed(2)} days</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Taken this year</p>
          <p className="text-lg font-semibold text-ink">{yearTotal.toFixed(2)} days</p>
        </div>
      </div>
      <p className="text-xs text-slate-400 mt-3">
        Balance tracking coming later — this counts leave taken only, for now.
      </p>
    </div>
  )
}
