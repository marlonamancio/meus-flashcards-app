import { Award } from 'lucide-react'
import type { BadgeInfo } from '@/lib/home-data'

export function BadgesRow({ badges }: { badges: BadgeInfo[] }) {
  return (
    <div className="flex gap-[9px] mt-[11px]">
      {badges.map((b) => (
        <div
          key={b.tipo}
          className="flex-1 flex flex-col items-center gap-[7px] text-center rounded-[14px]"
          style={{
            padding: '12px 8px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
            opacity: b.achieved ? 1 : 0.55,
          }}
        >
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 34,
              height: 34,
              background: b.achieved ? 'var(--accent-soft)' : 'var(--surface-2)',
              color: b.achieved ? 'var(--accent-strong)' : 'var(--muted)',
            }}
          >
            <Award size={17} strokeWidth={1.9} />
          </div>
          <div>
            <div className="text-[11.5px] font-bold leading-[1.1]">{b.label}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>
              {b.achieved ? `${b.target} atingido` : `faltam ${Math.max(0, b.target - b.current)}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
