'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItemDef = {
  label: string
  href: string
  icon: string
  match: readonly string[]
}

const ITEMS: NavItemDef[] = [
  { label: 'Início', href: '/home', icon: 'M3 11 12 3l9 8M5 9v11h5v-6h4v6h5V9', match: ['/home'] },
  { label: 'Coleções', href: '/colecoes', icon: 'M4 7h16M4 12h16M4 17h10', match: ['/colecoes', '/collection', '/unsorted'] },
]

const ITEMS_RIGHT: NavItemDef[] = [
  { label: 'Progresso', href: '/progresso', icon: 'M5 20V10M12 20V4M19 20v-7', match: ['/progresso'] },
  {
    label: 'Perfil',
    href: '/perfil',
    icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 4-6 8-6s8 2 8 6',
    match: ['/perfil'],
  },
]

function NavItem({ item, active }: { item: NavItemDef; active: boolean }) {
  return (
    <Link
      href={item.href}
      className="flex-1 flex flex-col items-center gap-1"
      style={{ color: active ? 'var(--accent-strong)' : 'var(--muted)' }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.9} strokeLinecap="round" strokeLinejoin="round">
        <path d={item.icon} />
      </svg>
      <span className="text-[10px]" style={{ fontWeight: active ? 700 : 500 }}>
        {item.label}
      </span>
    </Link>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const isActive = (matches: readonly string[]) => matches.some((m) => pathname.startsWith(m))

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 flex items-center z-20"
      style={{
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        padding: '10px 14px calc(env(safe-area-inset-bottom) + 14px)',
      }}
    >
      {ITEMS.map((item) => (
        <NavItem key={item.href} item={item} active={isActive(item.match)} />
      ))}

      <div className="flex-none" style={{ padding: '0 8px' }}>
        <Link
          href="/upload"
          aria-label="Novo material"
          className="flex items-center justify-center rounded-2xl"
          style={{
            width: 50,
            height: 50,
            background: 'linear-gradient(150deg, var(--accent), var(--accent-strong))',
            boxShadow: '0 8px 20px var(--accent-soft)',
            marginTop: -24,
            border: '3px solid var(--bg)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--on-accent)" strokeWidth="2.6" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>

      {ITEMS_RIGHT.map((item) => (
        <NavItem key={item.href} item={item} active={isActive(item.match)} />
      ))}
    </nav>
  )
}
