-- Badges: gamification achievements
CREATE TABLE public.badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo       TEXT NOT NULL CHECK (tipo IN ('cards_revisados', 'dias_ofensiva', 'acertos')),
  meta_alvo  INTEGER NOT NULL,
  atingido_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários visualizam seus próprios badges"
  ON public.badges FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.badges TO authenticated;
