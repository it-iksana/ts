export default function TotalsWidget({
  weekTotal,
  monthTotal,
}: {
  weekTotal: number
  monthTotal: number
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-medium text-slate-400 mb-3">Total hours</p>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-500">Week total (till date)</p>
          <p className="text-lg font-semibold text-ink">{weekTotal.toFixed(2)} days</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Month total (till date)</p>
          <p className="text-lg font-semibold text-ink">{monthTotal.toFixed(2)} days</p>
        </div>
      </div>
    </div>
  )
}
