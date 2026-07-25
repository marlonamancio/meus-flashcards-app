-- Study progress: which flashcards have already been answered in the current pass through a
-- collection's study mode, so a session closed mid-way (via the X button) can resume from the
-- next unseen card instead of restarting from the first one. Rows for a collection are cleared
-- once a full pass completes, starting the next session fresh.
CREATE TABLE public.study_progress (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  flashcard_id  UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  visto_em      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, collection_id, flashcard_id)
);

ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seu próprio progresso de estudo"
  ON public.study_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_progress TO authenticated;
