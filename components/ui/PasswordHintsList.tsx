import type { PasswordHints } from '@/lib/password-policy'

export function PasswordHintsList({ hints }: { hints: PasswordHints }) {
  return (
    <ul className="space-y-1 mt-1">
      {!hints.length && (
        <li className="text-xs" style={{ color: 'var(--bad)' }}>
          Mínimo de 6 caracteres
        </li>
      )}
      {!hints.uppercase && (
        <li className="text-xs" style={{ color: 'var(--bad)' }}>
          Adicione uma letra maiúscula
        </li>
      )}
      {!hints.lowercase && (
        <li className="text-xs" style={{ color: 'var(--bad)' }}>
          Adicione uma letra minúscula
        </li>
      )}
      {!hints.number && (
        <li className="text-xs" style={{ color: 'var(--bad)' }}>
          Adicione um número
        </li>
      )}
      {!hints.symbol && (
        <li className="text-xs" style={{ color: 'var(--bad)' }}>
          Adicione um símbolo (ex: !@#$)
        </li>
      )}
    </ul>
  )
}
