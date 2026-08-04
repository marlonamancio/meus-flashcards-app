-- Corrige um gap real de RLS encontrado em auditoria de segurança: as policies originais de
-- collection_flashcards (004), flashcard_responses (005) e flashcard_schedule (010) só verificam
-- que a linha sendo escrita pertence ao usuário atual (user_id / collection_id) — nenhuma delas
-- verifica que o flashcard_id referenciado também pertence a esse mesmo usuário. Isso permite,
-- via uma chamada direta ao Supabase (bypassando as Server Actions da aplicação, que já foram
-- corrigidas separadamente para verificar posse antes de escrever), vincular/gravar dado
-- referenciando o flashcard_id de QUALQUER usuário:
--   - collection_flashcards: linkar o flashcard de outro usuário à própria coleção
--   - flashcard_responses / flashcard_schedule: gravar resposta/agendamento SM-2 referenciando
--     o flashcard de outro usuário
--
-- USING (SELECT/UPDATE/DELETE de linhas já existentes) fica como estava — o dono da linha ainda
-- pode limpar associações antigas mesmo que o flashcard_id referenciado não seja mais dele (ex:
-- dado legado). Só WITH CHECK (o que efetivamente governa INSERT, e UPDATE que troca o
-- flashcard_id) ganha a verificação adicional — é ali que a posse cruzada precisa ser garantida
-- no momento da escrita.

DROP POLICY "Usuários gerenciam suas próprias associações" ON public.collection_flashcards;

CREATE POLICY "Usuários gerenciam suas próprias associações"
  ON public.collection_flashcards FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.collections WHERE id = collection_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.collections WHERE id = collection_id AND user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.flashcards WHERE id = flashcard_id AND user_id = auth.uid())
  );

DROP POLICY "Usuários gerenciam suas próprias respostas" ON public.flashcard_responses;

CREATE POLICY "Usuários gerenciam suas próprias respostas"
  ON public.flashcard_responses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.flashcards WHERE id = flashcard_id AND user_id = auth.uid())
  );

DROP POLICY "Usuários gerenciam seu próprio agendamento de revisão" ON public.flashcard_schedule;

CREATE POLICY "Usuários gerenciam seu próprio agendamento de revisão"
  ON public.flashcard_schedule FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.flashcards WHERE id = flashcard_id AND user_id = auth.uid())
  );
