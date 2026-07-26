-- 4-level rating (Não lembrei/Foi difícil/Fui bem/Fácil demais, stored as 0-3) feeding the SM-2
-- schedule going forward. Nullable and additive: existing rows keep acertou only and get
-- rating = null, since historical boolean responses are never converted into SM-2 state (see
-- CLAUDE.md item 6, "Compatibilidade com dado histórico").
ALTER TABLE public.flashcard_responses
  ADD COLUMN rating SMALLINT CHECK (rating IS NULL OR rating BETWEEN 0 AND 3);
