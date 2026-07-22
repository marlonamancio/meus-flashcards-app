-- Flashcards: individual study cards
CREATE TABLE public.flashcards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  frente      TEXT NOT NULL,
  verso       TEXT NOT NULL,
  origem      TEXT NOT NULL DEFAULT 'ia' CHECK (origem IN ('ia', 'csv', 'manual')),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seus próprios flashcards"
  ON public.flashcards FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
