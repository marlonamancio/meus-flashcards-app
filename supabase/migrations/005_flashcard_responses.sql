-- Flashcard responses: study session results
CREATE TABLE public.flashcard_responses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  acertou      BOOLEAN NOT NULL,
  respondido_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcard_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam suas próprias respostas"
  ON public.flashcard_responses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_responses TO authenticated;
