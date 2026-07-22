import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div>
      {/* Logo/brand */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
             style={{ background: 'var(--primary)' }}>
          <span className="text-2xl font-bold text-white">F</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
          Meus Flashcards
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--foreground-muted)' }}>
          Entre para acessar seus estudos
        </p>
      </div>

      <LoginForm />
    </div>
  )
}
