import AppHeader from '../../_components/app-header'
import ChangePasswordForm from './change-password-form'

export default function ChangePasswordPage() {
  return (
    <main className="min-h-screen bg-paper">
      <AppHeader title="Change Password" />

      <div className="max-w-sm mx-auto px-6 py-10">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  )
}
