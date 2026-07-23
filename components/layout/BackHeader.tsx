import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export function BackHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <div className="flex items-center gap-[14px]" style={{ padding: '10px 0 12px' }}>
      <Link
        href={backHref}
        aria-label="Voltar"
        className="flex items-center justify-center rounded-[11px] flex-none"
        style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <ArrowLeft size={19} strokeWidth={2.2} />
      </Link>
      <div className="text-[18px] font-bold" style={{ letterSpacing: '-0.01em' }}>
        {title}
      </div>
    </div>
  )
}
