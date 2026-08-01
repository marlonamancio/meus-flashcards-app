-- Estágio 3 (revisão + salvamento): depois que os cards revisados são persistidos em
-- flashcards, o ciclo do material termina. 'concluido' fecha a máquina de estado iniciada em
-- 001/015: processando -> pronto -> gerando -> aguardando_revisao -> concluido | erro.
ALTER TABLE public.materials DROP CONSTRAINT materials_status_check;
ALTER TABLE public.materials ADD CONSTRAINT materials_status_check
  CHECK (status IN ('processando', 'pronto', 'gerando', 'aguardando_revisao', 'concluido', 'erro'));
