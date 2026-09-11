import ConnectionStatus from '../connection-status'

export default function StatusPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow p-8 text-center">
        <p className="text-sm font-semibold text-brand-blue mb-1">
          iKSANA
        </p>
        <h1 className="text-2xl font-bold text-ink mb-6">System Status</h1>
        <ConnectionStatus />
      </div>
    </main>
  )
}
