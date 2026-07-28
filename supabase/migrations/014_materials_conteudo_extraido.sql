-- Persists the Stage-1 extraction output so Stage 2 (geração de flashcards) can read it without
-- re-extracting: conteudo_extraido is an array of text chunks (see lib/extraction/chunk.ts),
-- ready to feed one at a time into the future generation call. erro_mensagem is set when status
-- becomes 'erro', for display/debugging.
ALTER TABLE public.materials
  ADD COLUMN conteudo_extraido JSONB,
  ADD COLUMN erro_mensagem TEXT;
