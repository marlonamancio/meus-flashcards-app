import type { ReactNode } from 'react'
import { ThemeToggleButton } from '@/components/layout/ThemeToggleButton'

export function Header({ displayName, children }: { displayName: string | null; children: ReactNode }) {
  const initial = (displayName ?? 'U').charAt(0).toUpperCase()

  return (
    <div className="flex justify-between items-center" style={{ padding: '8px 0 4px' }}>
      <div className="min-w-0 flex-1">{children}</div>
      <div className="flex items-center gap-2.5 flex-none">
        <ThemeToggleButton />
        <div
          className="flex items-center justify-center rounded-full flex-none text-[16px] font-bold"
          style={{ width: 42, height: 42, background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
        >
          {initial}
        </div>
      </div>
    </div>
  )
}
