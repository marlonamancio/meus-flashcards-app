import type { CSSProperties, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

export type AlertTone = 'bad' | 'accent'

// Body text uses var(--text), not the tone color, on purpose: var(--bad) on var(--bad-soft)
// measures ~3:1 contrast in both themes (fails WCAG AA's 4.5:1 for body text). The tone color
// stays on the icon, which still reads as an error/status signal without sacrificing legibility.
const TONE_STYLES: Record<AlertTone, { background: string; iconColor: string }> = {
  bad: { background: 'var(--bad-soft)', iconColor: 'var(--bad)' },
  accent: { background: 'var(--accent-soft)', iconColor: 'var(--accent-strong)' },
}

// tone="accent" is for in-progress/status messages (extraction, generation) — real errors keep
// the default tone="bad". Pass `icon` to swap the default triangle for something like a spinner.
export function Alert({
  children,
  className,
  style,
  tone = 'bad',
  icon,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  tone?: AlertTone
  icon?: ReactNode
}) {
  const toneStyle = TONE_STYLES[tone]
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 9,
        padding: '12px 14px',
        borderRadius: 13,
        background: toneStyle.background,
        color: 'var(--text)',
        ...style,
      }}
    >
      {icon ?? <AlertTriangle size={16} strokeWidth={2.2} style={{ flexShrink: 0, marginTop: 1, color: toneStyle.iconColor }} />}
      <div className="text-xs" style={{ lineHeight: 1.5 }}>
        {children}
      </div>
    </div>
  )
}
