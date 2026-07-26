-- Flashcard schedule: SM-2 spaced-repetition state per user+flashcard. Drives which cards are
-- due for review ("Estudar esta coleção" shows only cards with due_date <= today, or never
-- reviewed). See lib/sm2.ts for the algorithm and CLAUDE.md item 6 for the product decision.
CREATE TABLE public.flashcard_schedule (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id  UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  repetitions   SMALLINT NOT NULL DEFAULT 0,
  interval_days INTEGER NOT NULL DEFAULT 0,
  ease_factor   NUMERIC(4, 2) NOT NULL DEFAULT 2.5,
  due_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, flashcard_id)
);

ALTER TABLE public.flashcard_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seu próprio agendamento de revisão"
  ON public.flashcard_schedule FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcard_schedule TO authenticated;
