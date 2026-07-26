export type PrioritizableCard = { id: string; daysOverdue: number | null }

// Cards more overdue for review show up earlier in a study session — never-reviewed cards count
// as maximum priority (every brand-new card enters today's queue right away), same "unknown =
// needs attention" convention used before this switched from "lowest accuracy first" to
// due-date-driven SM-2 scheduling. A small random jitter is mixed into the sort key so the order
// isn't 100% fixed session to session.
const JITTER_RANGE = 0.3

// `urgency` saturates towards (but never reaches) 1 as daysOverdue grows: a card due today
// (0 days overdue) starts at 0, one day overdue is 0.5, six days overdue is ~0.86, and so on —
// diminishing returns rather than letting a handful of very stale cards swamp everything else.
// A never-reviewed card gets urgency exactly 1, so it always outranks any merely-overdue one,
// same as before. Jitter amplitude (0.3, i.e. ±0.15) stays well below the 0..1 range, so a card
// that's clearly more overdue than another still always sorts first — only cards with similar
// urgency end up shuffled among themselves.
export function orderByPriority<T extends PrioritizableCard>(cards: T[]): T[] {
  return cards
    .map((card) => {
      const urgency = card.daysOverdue === null ? 1 : 1 - 1 / (1 + Math.max(0, card.daysOverdue))
      const jitter = (Math.random() - 0.5) * JITTER_RANGE
      return { card, key: urgency + jitter }
    })
    .sort((a, b) => b.key - a.key)
    .map((entry) => entry.card)
}
