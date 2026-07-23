import type { ReactNode } from 'react'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/navigation/BottomNav'

export function AppShell({
  displayName,
  header,
  children,
}: {
  displayName: string | null
  header: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <main className="max-w-md mx-auto" style={{ padding: '6px 22px 96px' }}>
        <Header displayName={displayName}>{header}</Header>
        {children}
      </main>
      <BottomNav />
    </>
  )
}
