import { SignupForm } from '@/components/auth/SignupForm'
import { LogoMark } from '@/components/layout/LogoMark'

export default function CadastroPage() {
  return (
    <div>
      <div className="mb-5">
        <LogoMark size={52} />
      </div>

      <h1
        className="text-[27px] font-bold mb-2"
        style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
      >
        Criar conta
      </h1>
      <p className="text-[14.5px] leading-relaxed mb-9" style={{ color: 'var(--muted)' }}>
        Cadastre-se para gerar e estudar seus flashcards.
      </p>

      <SignupForm />
    </div>
  )
}
