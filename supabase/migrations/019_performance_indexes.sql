-- Índices ausentes identificados na auditoria de performance ampliada (ver CLAUDE.md "Performance
-- — auditoria de navegação lenta"): flashcard_responses e flashcards são as duas tabelas que mais
-- crescem (uma linha por resposta/por card, para sempre) e são filtradas por user_id em
-- praticamente toda tela do app (Home, Progresso, Coleções, detalhe da coleção, Estudar), mas não
-- tinham nenhum índice além da própria PK — Postgres não cria índice automático em coluna de FK.
-- Sem índice, toda leitura nessas tabelas é um scan sequencial filtrado por RLS/`.eq('user_id')`.

-- flashcard_responses: o padrão de filtro mais comum no código é `.eq('user_id', x)` sozinho ou
-- combinado com `.in('flashcard_id', ids)` (getCollectionMeta, getDueMap-adjacent queries,
-- getProgressoData, getOverallStats, getBadges) — um índice composto com user_id como coluna
-- líder cobre os dois casos (prefixo esquerdo já atende o filtro sozinho).
CREATE INDEX flashcard_responses_user_id_flashcard_id_idx
  ON public.flashcard_responses (user_id, flashcard_id);

-- flashcards: usado sem filtro por id em getUnsortedFlashcardIds e na antiga getGlobalWeakCards
-- (hoje getProgressoData) — `.eq('user_id', userId)` sozinho, sem acompanhar de `.in('id', ...)`.
CREATE INDEX flashcards_user_id_idx
  ON public.flashcards (user_id);
