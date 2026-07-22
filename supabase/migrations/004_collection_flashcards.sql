-- Junction table: many-to-many between collections and flashcards
CREATE TABLE public.collection_flashcards (
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  flashcard_id  UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  PRIMARY KEY (collection_id, flashcard_id)
);

ALTER TABLE public.collection_flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam suas próprias associações"
  ON public.collection_flashcards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections
      WHERE id = collection_id AND user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_flashcards TO authenticated;
