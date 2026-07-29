import Anthropic from '@anthropic-ai/sdk'
import type { GeneratedCard, Quantidade } from './types'

// Same model as extraction's vision fallback (lib/extraction/claude-vision.ts) — concurso público
// content leans on exact article numbers/dates, where the extra precision pays for itself.
const GENERATION_MODEL = 'claude-sonnet-5'

let client: Anthropic | undefined

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return client
}

// Tool use (function calling) instead of asking for JSON in free text — see CLAUDE.md "Formato
// do prompt de geração de flashcards": more reliable, avoids fragile parsing of markdown/loose
// text around the JSON. Schema and tool_choice match CLAUDE.md's documented format exactly.
const CRIAR_FLASHCARDS_TOOL: Anthropic.Tool = {
  name: 'criar_flashcards',
  description: 'Cria uma lista de flashcards de estudo',
  input_schema: {
    type: 'object',
    properties: {
      cards: {
        type: 'array',
        items: {
          type: 'object',
          properties: { frente: { type: 'string' }, verso: { type: 'string' } },
          required: ['frente', 'verso'],
        },
      },
    },
    required: ['cards'],
  },
}

// Revisado após teste real com material denso: o prompt anterior (mais genérico) gerou 702
// cards de baixa qualidade a partir de uma apostila de 130 páginas ($1,29 de custo) — cards sobre
// metadados do documento, cards citando a questão de banca específica em vez do conceito
// testado, e a mesma regra repetida dezenas de vezes (uma vez por questão que a testava, em vez
// de consolidada). Ver CLAUDE.md "Formato do prompt de geração de flashcards" para o diagnóstico
// completo e o padrão de card problemático encontrado.
const SYSTEM_PROMPT = `Você é um assistente especializado em criar flashcards de estudo eficazes
para concursos públicos brasileiros.

O objetivo é ensinar CONCEITOS E REGRAS da matéria, não testar conhecimento
sobre o documento em si. Aplique estas diretrizes rigorosamente:

EXCLUIR COMPLETAMENTE (nunca gerar cards sobre):
- Metadados do documento: autor, data de produção/publicação, número total
  de páginas, estrutura do sumário/índice, em qual página um tópico começa
- Citação ou paráfrase de uma questão de prova específica do material (ex:
  "Na questão do CEBRASPE/X/ano, por que a alternativa Y está correta?") —
  extraia a REGRA OU CONCEITO geral testado pela questão, nunca o enunciado
  da questão em si, o nome da banca, ou o ano do concurso
- Referências a "o texto", "o material", "o autor menciona" — o flashcard
  deve ser sobre a matéria, como se fosse extraído de um livro didático,
  não sobre o documento fonte

CONSOLIDAR EM VEZ DE REPETIR:
- Se o mesmo conceito/regra aparece testado várias vezes no material (comum
  em apostilas de concurso, que repetem a mesma regra gramatical/jurídica
  via dezenas de questões de banca diferentes), gere UM ÚNICO flashcard
  canônico sobre essa regra — nunca um card por questão de banca que a
  testa. Isso é o erro mais comum a evitar: múltiplos cards quase idênticos
  sobre a mesma regra, cada um citando um exemplo/questão diferente.
- Prefira cards que testam APLICAÇÃO de um conceito ("por que a palavra X
  segue a regra Y?") a cards de "cite exemplos de X" (memorização de lista,
  menor valor de recordação)

QUALIDADE POR CIMA DE QUANTIDADE:
- Cada flashcard testa um único conceito ou fato (atomicidade)
- Perguntas claras e diretas, sem ambiguidade
- Respostas concisas mas completas
- Evite perguntas triviais demais ou fáceis demais a ponto de não exigir
  recordação real
- Preserve com precisão números de artigo de lei, datas e nomes próprios
  quando forem parte do CONTEÚDO da matéria (não do documento em si)
- Responda chamando a ferramenta criar_flashcards, sem texto adicional`

// Faixa alvo automática pro material INTEIRO (ver CLAUDE.md "Quantidade"). Quando o material é
// processado em vários chunks paralelos, cada chunk precisa mirar uma FRAÇÃO dessa faixa, não a
// faixa inteira de novo — senão N chunks somam até N×60 cards no pior caso, mesmo com o prompt
// revisado (ver CLAUDE.md "Risco arquitetural a observar").
const AUTO_TOTAL_MIN = 15
const AUTO_TOTAL_MAX = 60

// Sem piso, a divisão linear degenera pra materiais com muitos chunks (ex: 31 chunks reais de uma
// apostila de 130 páginas → 60/31 ≈ 2 cards/chunk) — instruir "no máximo 2" força consolidar
// regras genuinamente DISTINTAS dentro do mesmo trecho (ex: várias exceções de hífen diferentes)
// num único card, o que piora atomicidade em vez de melhorar. O piso garante espaço pra um trecho
// denso cobrir seus conceitos de verdade, ainda reduzindo bastante o teto de um chunk sozinho
// (antes: até 40-60 sem limite algum por chunk).
const MIN_PER_CHUNK_CEILING = 4

// Quantidade manual em material com vários chunks paralelos: cada chunk NÃO recebe uma fração
// exata de N (round(N/chunks) degenera pra 1 em materiais com muitos chunks, e "exatamente 1" não
// é obedecido de forma confiável pelo modelo quando o trecho sustenta mais conteúdo genuíno — bug
// real encontrado com N=30 em 31 chunks: soma final de 51, bem longe do pedido). Em vez disso,
// cada chunk gera generosamente (até um teto com folga, mas ainda podendo gerar menos ou zero se
// não houver conteúdo real) e selectBestCards() corta pro N exato no final — ver CLAUDE.md
// "Quantidade" e o diagnóstico com curso-227874-aula-00.
const MANUAL_OVERSHOOT_FACTOR = 1.5

export type ChunkContext = { index: number; total: number }

function quantidadeInstruction(quantidade: Quantidade, chunkContext?: ChunkContext): string {
  if (quantidade.type === 'manual') {
    if (chunkContext && chunkContext.total > 1) {
      const perChunkCap = Math.max(MIN_PER_CHUNK_CEILING, Math.ceil((quantidade.count * MANUAL_OVERSHOOT_FACTOR) / chunkContext.total))
      return (
        `Este é o trecho ${chunkContext.index + 1} de ${chunkContext.total} de um material maior, processado em partes. ` +
        `O material completo deve somar aproximadamente ${quantidade.count} flashcards ao final — uma etapa posterior ` +
        `seleciona os melhores entre todos os trechos até bater esse total exato, então não se preocupe em acertar um ` +
        `número exato aqui. Gere no máximo ${perChunkCap} flashcards cobrindo os CONCEITOS distintos deste trecho ` +
        'especificamente — gere menos, inclusive zero, se o trecho não tiver conceitos de estudo reais (ex: é só capa, ' +
        'sumário/índice, ou metadados do documento). Não gere um card artificial só para cumprir uma cota se não houver ' +
        'conteúdo genuíno neste trecho. Não gere uma pergunta por ocorrência/exemplo/questão de banca — se o mesmo ' +
        'conceito aparece várias vezes neste trecho, consolide num único card.'
      )
    }
    return `Gere exatamente ${quantidade.count} flashcards cobrindo os conceitos mais importantes.`
  }

  if (chunkContext && chunkContext.total > 1) {
    const perChunkMax = Math.max(MIN_PER_CHUNK_CEILING, Math.round(AUTO_TOTAL_MAX / chunkContext.total))
    const perChunkMin = Math.min(perChunkMax, Math.max(1, Math.round(AUTO_TOTAL_MIN / chunkContext.total)))
    return (
      `Este é o trecho ${chunkContext.index + 1} de ${chunkContext.total} de um material maior, processado em partes. ` +
      `Gere no máximo ${perChunkMax} flashcards (idealmente entre ${perChunkMin} e ${perChunkMax}) cobrindo os ` +
      'CONCEITOS distintos deste trecho especificamente — pode gerar menos se o trecho não tiver tantos conceitos ' +
      `distintos. O material completo, somando todos os trechos, deve ficar próximo de ${AUTO_TOTAL_MIN}-${AUTO_TOTAL_MAX} ` +
      'cards no total. Não gere uma pergunta por ocorrência/exemplo/questão de banca — se o mesmo conceito aparece ' +
      'várias vezes neste trecho, consolide num único card.'
    )
  }

  return (
    'Gere flashcards cobrindo os CONCEITOS distintos do material, não uma pergunta por ' +
    'ocorrência/exemplo/questão de banca. Um material denso mas repetitivo (mesma regra testada ' +
    'de várias formas) deve gerar poucas dezenas de cards consolidados, não centenas. Normalmente ' +
    `entre ${AUTO_TOTAL_MIN} e ${AUTO_TOTAL_MAX} cards por material, mesmo que o conteúdo bruto seja extenso — ` +
    'priorize qualidade e consolidação sobre volume.'
  )
}

// Modo arquivo vs modo tema livre produzem prompts deliberadamente diferentes — não é cosmético,
// define o comportamento de precisão (ver CLAUDE.md "Diferença crítica entre os dois modos de
// entrada"): modo arquivo proíbe informação externa ao texto fornecido; modo tema livre pede
// precisão factual por conta própria, já que não há fonte de referência da usuária.
function fileModePrompt(content: string, quantidade: Quantidade, chunkContext?: ChunkContext): string {
  return (
    'Gere flashcards EXCLUSIVAMENTE a partir do conteúdo abaixo. Não adicione informação externa ' +
    'ao que está no texto, mesmo que você "saiba" mais sobre o assunto — a fonte de verdade é o ' +
    'material fornecido pelo usuário.\n\n' +
    `${quantidadeInstruction(quantidade, chunkContext)}\n\n--- CONTEÚDO ---\n${content}`
  )
}

function themeModePrompt(tema: string, quantidade: Quantidade): string {
  return (
    'Gere flashcards sobre o tema abaixo, usando seu conhecimento. Priorize precisão factual: se ' +
    'não tiver certeza absoluta de um número de artigo de lei, data específica ou dado exato, ' +
    'prefira formular a pergunta de forma mais conceitual em vez de arriscar um número impreciso.\n\n' +
    `${quantidadeInstruction(quantidade)}\n\n--- TEMA ---\n${tema}`
  )
}

function isValidCard(value: unknown): value is GeneratedCard {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.frente === 'string' &&
    record.frente.trim().length > 0 &&
    typeof record.verso === 'string' &&
    record.verso.trim().length > 0
  )
}

function extractCardsFromToolUse(message: Anthropic.Message): GeneratedCard[] {
  const toolUseBlock = message.content.find((block) => block.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error('A IA não retornou os flashcards no formato esperado (sem tool_use).')
  }

  const input = toolUseBlock.input
  if (typeof input !== 'object' || input === null || !Array.isArray((input as Record<string, unknown>).cards)) {
    throw new Error('A IA retornou um formato inesperado para os flashcards (campo "cards" ausente ou não é uma lista).')
  }

  const rawCards = (input as Record<string, unknown>).cards as unknown[]

  // An empty array is a VALID, correct response — not every trecho tem conteúdo que mereça virar
  // flashcard (ex: capa/autor/sumário/índice, exatamente o que o prompt agora instrui a excluir
  // explicitamente). Tratar "zero cards" como erro aqui derrubava a geração do material inteiro
  // por causa de um único chunk corretamente vazio — bug real encontrado com
  // curso-227874-aula-00 (trecho 1/31 é só capa+índice, IA respondeu cards:[] de forma
  // consistente e coerente, e o material inteiro falhava por causa disso).
  if (rawCards.length === 0) {
    return []
  }

  const cards = rawCards.filter(isValidCard).map((card) => ({ frente: card.frente.trim(), verso: card.verso.trim() }))

  // Aqui sim é malformação de verdade: a IA tentou retornar cards (array não-vazio) mas nenhum
  // item bateu o formato esperado — diferente de um array vazio genuíno, tratado acima.
  if (cards.length === 0) {
    throw new Error('A IA retornou uma lista de flashcards malformada (nenhum item com o formato esperado).')
  }

  return cards
}

async function callCriarFlashcards(userPrompt: string): Promise<GeneratedCard[]> {
  const message = await getClient().messages.create({
    model: GENERATION_MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    tools: [CRIAR_FLASHCARDS_TOOL],
    tool_choice: { type: 'tool', name: 'criar_flashcards' },
    messages: [{ role: 'user', content: userPrompt }],
  })

  return extractCardsFromToolUse(message)
}

const SELECTION_SYSTEM_PROMPT = `Você seleciona os melhores flashcards de estudo dentre uma lista de candidatos já gerados.

Critérios de seleção:
- Priorize cobertura de CONCEITOS DISTINTOS — se dois candidatos testam essencialmente a mesma
  regra/conceito, mantenha só o melhor dos dois
- Descarte primeiro os candidatos mais triviais ou de menor valor de recordação
- Preserve a diversidade de tópicos do material inteiro, não só de uma parte dele
- Não reescreva frente/verso dos candidatos mantidos — copie o texto exatamente como está
- Responda chamando a ferramenta criar_flashcards só com os cards selecionados, sem texto adicional`

// Corta um pool de candidatos (gerado com folga por chunk, ver quantidadeInstruction) pro N exato
// pedido em modo manual — é isso que de fato GARANTE o total certo, em vez de só aproximar melhor
// a divisão entre chunks paralelos independentes (que não conseguem, sozinhos, coordenar uma soma
// exata). Um corte por seleção via IA (em vez de slice arbitrário) atende ao pedido de "descartar
// os de menor qualidade" em vez de descartar por ordem de chegada.
export async function selectBestCards(candidates: GeneratedCard[], targetCount: number): Promise<GeneratedCard[]> {
  if (candidates.length <= targetCount) return candidates

  const message = await getClient().messages.create({
    model: GENERATION_MODEL,
    max_tokens: 8192,
    system: SELECTION_SYSTEM_PROMPT,
    tools: [CRIAR_FLASHCARDS_TOOL],
    tool_choice: { type: 'tool', name: 'criar_flashcards' },
    messages: [
      {
        role: 'user',
        content:
          `Selecione exatamente ${targetCount} dos ${candidates.length} flashcards candidatos abaixo, mantendo o texto ` +
          `de frente/verso exatamente como está.\n\n${JSON.stringify(candidates)}`,
      },
    ],
  })

  const selected = extractCardsFromToolUse(message)
  // Defesa: modelos não obedecem "exatamente N" de forma confiável (mesmo problema que motivou
  // essa função) — o corte aqui garante de verdade que nunca voltamos mais que targetCount,
  // independente do que a chamada de seleção decidir.
  return selected.slice(0, targetCount)
}

export async function generateFlashcardsFromContent(
  content: string,
  quantidade: Quantidade,
  chunkContext?: ChunkContext
): Promise<GeneratedCard[]> {
  return callCriarFlashcards(fileModePrompt(content, quantidade, chunkContext))
}

export async function generateFlashcardsFromTheme(tema: string, quantidade: Quantidade): Promise<GeneratedCard[]> {
  return callCriarFlashcards(themeModePrompt(tema, quantidade))
}
