import type Anthropic from '@anthropic-ai/sdk'
import { getClient, GENERATION_MODEL } from './tool'
import type { UnsortedCard, CollectionOption } from '@/lib/collections-data'

export type CollectionSuggestion = {
  flashcardId: string
  collectionId: string | null
}

// One batch call for every orphan card, not one call per card — see CLAUDE.md item 9
// ("Arquitetura da sugestão"): calling the API card-by-card would be needlessly slow and
// expensive for a potentially long orphan list.
const SUGERIR_COLECOES_TOOL: Anthropic.Tool = {
  name: 'sugerir_colecoes',
  description: 'Retorna, para cada flashcard informado, a coleção existente mais adequada para ele.',
  input_schema: {
    type: 'object',
    properties: {
      sugestoes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            flashcard_id: { type: 'string', description: 'O id do flashcard, exatamente como informado.' },
            collection_id: {
              type: 'string',
              description: 'O id de uma das coleções existentes informadas. Omita este campo se nenhuma delas fizer sentido para este card.',
            },
          },
          required: ['flashcard_id'],
        },
      },
    },
    required: ['sugestoes'],
  },
}

const SUGGESTION_SYSTEM_PROMPT = `Você organiza flashcards de estudo em coleções já existentes de uma usuária.

Para cada flashcard informado, decida qual das coleções existentes é o destino mais adequado para
o conteúdo dele, com base no assunto/matéria do flashcard e no nome de cada coleção.

REGRAS OBRIGATÓRIAS:
- Você NUNCA cria ou sugere uma coleção nova — a sugestão é sempre uma das coleções existentes
  informadas, identificada pelo "collection_id" exato dela.
- Se nenhuma coleção existente fizer sentido para um flashcard, OMITA o campo "collection_id"
  nesse item, em vez de forçar uma sugestão ruim.
- Retorne uma entrada para cada flashcard_id informado, mesmo quando a sugestão for "nenhuma".
- Responda chamando a ferramenta sugerir_colecoes, sem texto adicional.`

function isValidSuggestionEntry(value: unknown): value is { flashcard_id: string; collection_id?: unknown } {
  return typeof value === 'object' && value !== null && typeof (value as Record<string, unknown>).flashcard_id === 'string'
}

function extractSuggestions(message: Anthropic.Message, validCollectionIds: Set<string>): CollectionSuggestion[] {
  const toolUseBlock = message.content.find((block) => block.type === 'tool_use')
  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw new Error('A IA não retornou as sugestões no formato esperado (sem tool_use).')
  }

  const input = toolUseBlock.input
  if (typeof input !== 'object' || input === null || !Array.isArray((input as Record<string, unknown>).sugestoes)) {
    throw new Error('A IA retornou um formato inesperado para as sugestões (campo "sugestoes" ausente ou não é uma lista).')
  }

  const rawSuggestions = (input as Record<string, unknown>).sugestoes as unknown[]

  return rawSuggestions.filter(isValidSuggestionEntry).map((entry) => {
    // Defense against a hallucinated/invalid id: never trust the model to only reference real
    // collections, even though the prompt instructs it to — treat anything outside the actual
    // set of existing collection ids the same as "no suggestion" (CLAUDE.md item 9: "a IA nunca
    // inventa coleção nova").
    const collectionId = typeof entry.collection_id === 'string' && validCollectionIds.has(entry.collection_id) ? entry.collection_id : null
    return { flashcardId: entry.flashcard_id, collectionId }
  })
}

// Skips the API call entirely when there's nothing to suggest into (CLAUDE.md item 9: "Se a
// usuária não tiver nenhuma coleção ainda... pular a chamada de IA"), or nothing to suggest for.
export async function suggestCollectionsForCards(cards: UnsortedCard[], collections: CollectionOption[]): Promise<CollectionSuggestion[]> {
  if (cards.length === 0 || collections.length === 0) {
    return cards.map((c) => ({ flashcardId: c.id, collectionId: null }))
  }

  const userPrompt =
    `Coleções existentes:\n${JSON.stringify(collections.map((c) => ({ collection_id: c.id, nome: c.nome })))}\n\n` +
    `Flashcards a organizar:\n${JSON.stringify(cards.map((c) => ({ flashcard_id: c.id, frente: c.frente, verso: c.verso })))}`

  const message = await getClient().messages.create({
    model: GENERATION_MODEL,
    max_tokens: 4096,
    system: SUGGESTION_SYSTEM_PROMPT,
    tools: [SUGERIR_COLECOES_TOOL],
    tool_choice: { type: 'tool', name: 'sugerir_colecoes' },
    messages: [{ role: 'user', content: userPrompt }],
  })

  const validCollectionIds = new Set(collections.map((c) => c.id))
  return extractSuggestions(message, validCollectionIds)
}
