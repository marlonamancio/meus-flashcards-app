export type PrioritizableCard = { id: string; accuracyPct: number | null }

// Cards with a lower historical accuracy show up earlier in a study session — never-answered
// cards count as maximum priority ("desconhecido = precisa de atenção"), same convention used by
// spaced-repetition tools for brand-new cards. A small random jitter is mixed into the sort key
// so the order isn't 100% fixed session to session: the jitter's amplitude (0.3, i.e. ±0.15) is
// well below the full 0..1 range of errorRate, so a card that's clearly worse than another still
// always sorts first — only cards with genuinely similar accuracy end up shuffled among
// themselves, which is exactly where randomness should act (it protects against memorizing a
// fixed sequence without undermining the "focus on what you get wrong" goal).
const JITTER_RANGE = 0.3

export function orderByPriority<T extends PrioritizableCard>(cards: T[]): T[] {
  return cards
    .map((card) => {
      const errorRate = card.accuracyPct === null ? 1 : (100 - card.accuracyPct) / 100
      const jitter = (Math.random() - 0.5) * JITTER_RANGE
      return { card, key: errorRate + jitter }
    })
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.card)
}
