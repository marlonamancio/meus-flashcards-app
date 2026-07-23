import type { ReactNode } from 'react'
import { BottomNav } from '@/components/navigation/BottomNav'

export function AppShell({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <>
      <main className="max-w-md mx-auto" style={{ padding: '6px 22px 96px' }}>
        {header}
        {children}
      </main>
      <BottomNav />
    </>
  )
}
