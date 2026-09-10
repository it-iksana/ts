import ConnectionStatus from './connection-status'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
        <p className="text-sm font-semibold tracking-wide text-sky-700 uppercase mb-1">
          iKSANA
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Timesheet</h1>
        <p className="text-sm text-slate-500 mb-6">
          Starter deployment — confirming the pipeline works end to end
          before any real screens get built on top of it.
        </p>
        <ConnectionStatus />
      </div>
    </main>
  )
}
