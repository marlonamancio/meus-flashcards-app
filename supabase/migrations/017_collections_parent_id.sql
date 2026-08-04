-- Sub-coleções: hierarquia leve de um nível só (mãe -> filhas), adiantada de v2 por feedback real
-- de uso — matérias grandes (muitos cards numa coleção só) ficam difíceis de navegar. See
-- CLAUDE.md item 4 "Coleções", subitem "Sub-coleções".
--
-- ON DELETE SET NULL: se a mãe for apagada, as filhas não somem — só perdem o agrupamento e
-- voltam a aparecer soltas na lista de Coleções, mesmo comportamento já existente quando uma
-- coleção comum é apagada e seus flashcards viram "não organizados" (aqui é o mesmo princípio,
-- um nível acima: a coleção-filha não perde os próprios cards, só o vínculo com a mãe).
--
-- A regra de "um nível só" (uma filha não pode virar mãe de outra) é validada inteiramente na
-- Server Action que grava parent_id (app/(app)/collection/[id]/actions.ts), não aqui — um CHECK
-- de coluna não consegue inspecionar outra linha da mesma tabela. RLS por user_id já existente
-- (migration 003) continua suficiente: parent_id é só mais uma coluna da mesma linha, sem
-- exigir policy nova.
ALTER TABLE public.collections
  ADD COLUMN parent_id UUID REFERENCES public.collections(id) ON DELETE SET NULL;

CREATE INDEX collections_parent_id_idx ON public.collections(parent_id);
