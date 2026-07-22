-- Daily activity: one row per user per day for streak calendar
CREATE TABLE public.daily_activity (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data            DATE NOT NULL,
  cards_revisados INTEGER NOT NULL DEFAULT 0,
  meta_atingida   BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, data)
);

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam sua própria atividade diária"
  ON public.daily_activity FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_activity TO authenticated;
