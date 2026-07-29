-- Stage 2 (geração de flashcards): materials gains a "tema" mode alongside the existing
-- "arquivo" mode, reusing the same status state machine instead of a parallel system for
-- theme-only generation (no upload, no extraction). See CLAUDE.md "Campos novos em materials
-- para o pipeline de geração (Estágio 2)".
ALTER TABLE public.materials
  ADD COLUMN modo TEXT NOT NULL DEFAULT 'arquivo' CHECK (modo IN ('arquivo', 'tema')),
  ADD COLUMN tema TEXT,
  ADD COLUMN cards_gerados JSONB;

-- tipo is a file format — meaningless for modo='tema' (no file at all), so it must become
-- nullable, but only ever null in that case: modo='arquivo' still requires a real tipo.
ALTER TABLE public.materials ALTER COLUMN tipo DROP NOT NULL;
ALTER TABLE public.materials ADD CONSTRAINT materials_tipo_modo_check CHECK (
  (modo = 'arquivo' AND tipo IS NOT NULL) OR (modo = 'tema' AND tipo IS NULL)
);

-- status gains 'gerando' (chamando a IA) e 'aguardando_revisao' (cards gerados, esperando
-- revisão antes de salvar em flashcards de verdade — Estágio 3). Fluxo completo: processando
-- (extração) -> pronto (extração ok, ou direto pra tema sem extração) -> gerando ->
-- aguardando_revisao -> erro (a qualquer momento, nunca fica preso).
ALTER TABLE public.materials DROP CONSTRAINT materials_status_check;
ALTER TABLE public.materials ADD CONSTRAINT materials_status_check
  CHECK (status IN ('processando', 'pronto', 'gerando', 'aguardando_revisao', 'erro'));
