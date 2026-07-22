-- Materials: uploaded files that generate flashcards
CREATE TABLE public.materials (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  tipo         TEXT NOT NULL CHECK (tipo IN ('pdf', 'image', 'docx', 'pptx')),
  status       TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando', 'pronto', 'erro')),
  storage_path TEXT,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam seus próprios materiais"
  ON public.materials FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.materials TO authenticated;
