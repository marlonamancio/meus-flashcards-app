import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getHomeData } from '@/lib/home-data'
import { getDisplayFirstName } from '@/lib/user-display'
import { AppShell } from '@/components/layout/AppShell'
import { Header } from '@/components/layout/Header'
import { HeaderGreeting } from '@/components/layout/HeaderGreeting'
import { StreakCard } from '@/components/home/StreakCard'
import { BadgesRow } from '@/components/home/BadgesRow'
import { CollectionsList } from '@/components/home/CollectionsList'

export default async function HomePage() {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const displayName = getDisplayFirstName(user)
  const { stats, week, badges, collections } = await getHomeData(user.id)

  return (
    <AppShell header={<Header displayName={displayName}><HeaderGreeting displayName={displayName} /></Header>}>
      <StreakCard stats={stats} week={week} />
      <BadgesRow badges={badges} />
      <CollectionsList collections={collections} />
    </AppShell>
  )
}
