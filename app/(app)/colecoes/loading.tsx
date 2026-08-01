import { AppShell } from '@/components/layout/AppShell'
import { PageLoading } from '@/components/layout/PageLoading'

export default function Loading() {
  return (
    <AppShell header={null}>
      <PageLoading />
    </AppShell>
  )
}
