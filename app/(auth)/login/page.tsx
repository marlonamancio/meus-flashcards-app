import { LoginForm } from '@/components/auth/LoginForm'
import { LogoMark } from '@/components/layout/LogoMark'

export default function LoginPage() {
  return (
    <div>
      <div className="mb-5">
        <LogoMark size={52} />
      </div>

      <h1
        className="text-[27px] font-bold mb-2"
        style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
      >
        Meus Flashcards
      </h1>
      <p className="text-[14.5px] leading-relaxed mb-9" style={{ color: 'var(--muted)' }}>
        Bem-vinda de volta. Seus estudos continuam de onde você parou.
      </p>

      <LoginForm />
    </div>
  )
}
