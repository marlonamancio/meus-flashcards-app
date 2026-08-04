'use server'

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { getCollectionCardsPage, type CardsCursor, type CollectionCardsPage } from '@/lib/collections-data'

export type LoadMoreCardsResult = { ok: true; page: CollectionCardsPage } | { ok: false; error: string }

export async function loadMoreCardsAction(collectionId: string, cursor: CardsCursor): Promise<LoadMoreCardsResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const { data: collection, error } = await supabase.from('collections').select('id').eq('id', collectionId).eq('user_id', user.id).maybeSingle()

  if (error || !collection) {
    return { ok: false, error: 'Coleção não encontrada.' }
  }

  const page = await getCollectionCardsPage(supabase, user.id, collectionId, cursor)
  return { ok: true, page }
}

export type SetParentResult = { ok: true } | { ok: false; error: string }

// Sub-coleções, um nível só (CLAUDE.md item 4). Validado inteiramente aqui no servidor, nunca só
// na UI — a lista de coleções elegíveis já exclui quem tem parent_id preenchido (ver
// getEligibleParentOptions), mas essa é só a filtragem da UI: o cliente nunca é a fonte de
// verdade, então tudo é reconferido antes do UPDATE.
//
// Duas checagens são necessárias para de fato garantir um nível só, não uma:
// 1. A coleção-alvo (parentId) não pode já ter uma mãe — senão a coleção vira neta, não filha.
// 2. A própria coleção sendo movida não pode já ter filhas — senão, ao ganhar uma mãe, suas
//    filhas atuais virariam netas da nova mãe (dois níveis), mesmo que a checagem 1 passe.
export async function setCollectionParentAction(collectionId: string, parentId: string | null): Promise<SetParentResult> {
  const supabase = await createClient()
  const user = await requireUser(supabase)

  const { data: collection, error: fetchError } = await supabase
    .from('collections')
    .select('id')
    .eq('id', collectionId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fetchError || !collection) {
    return { ok: false, error: 'Coleção não encontrada.' }
  }

  if (parentId === null) {
    const { error: updateError } = await supabase.from('collections').update({ parent_id: null }).eq('id', collectionId)
    if (updateError) return { ok: false, error: 'Não foi possível desagrupar a coleção.' }
    return { ok: true }
  }

  if (parentId === collectionId) {
    return { ok: false, error: 'Uma coleção não pode ser mãe de si mesma.' }
  }

  const { data: parent, error: parentError } = await supabase
    .from('collections')
    .select('id, parent_id')
    .eq('id', parentId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (parentError || !parent) {
    return { ok: false, error: 'Coleção-mãe não encontrada.' }
  }
  if (parent.parent_id) {
    return { ok: false, error: 'Essa coleção já é filha de outra — só é permitido um nível de hierarquia.' }
  }

  const { data: ownChildren, error: ownChildrenError } = await supabase
    .from('collections')
    .select('id')
    .eq('parent_id', collectionId)
    .eq('user_id', user.id)
    .limit(1)

  if (ownChildrenError) {
    return { ok: false, error: 'Não foi possível validar a hierarquia.' }
  }
  if (ownChildren && ownChildren.length > 0) {
    return { ok: false, error: 'Essa coleção já tem subcoleções — desagrupe-as antes de torná-la filha de outra.' }
  }

  const { error: updateError } = await supabase.from('collections').update({ parent_id: parentId }).eq('id', collectionId)
  if (updateError) {
    return { ok: false, error: 'Não foi possível atualizar a coleção-mãe.' }
  }

  return { ok: true }
}
