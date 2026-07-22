-- User stats: streak, daily goal (one row per user, upserted)
CREATE TABLE public.user_stats (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_atual         INTEGER NOT NULL DEFAULT 0,
  streak_recorde       INTEGER NOT NULL DEFAULT 0,
  meta_diaria_cards    INTEGER NOT NULL DEFAULT 10,
  cards_estudados_hoje INTEGER NOT NULL DEFAULT 0,
  ultima_atividade_em  TIMESTAMPTZ
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seus próprios stats"
  ON public.user_stats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stats TO authenticated;
