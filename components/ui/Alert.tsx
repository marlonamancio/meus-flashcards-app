import type { CSSProperties, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

// Body text uses var(--text), not var(--bad), on purpose: var(--bad) on var(--bad-soft) measures
// ~3:1 contrast in both themes (fails WCAG AA's 4.5:1 for body text). var(--bad) stays on the
// icon, which still reads as an error/warning signal without sacrificing legibility.
export function Alert({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 9,
        padding: '12px 14px',
        borderRadius: 13,
        background: 'var(--bad-soft)',
        color: 'var(--text)',
        ...style,
      }}
    >
      <AlertTriangle size={16} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1, color: 'var(--bad)' }} />
      <div className="text-xs" style={{ lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  )
}
