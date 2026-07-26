import { addDaysToDateString } from '@/lib/home-data'

// SM-2 (SuperMemo, Wozniak 1987) — classic formulation, kept as a pure function so it can be
// tested without a database or a clock. `today` is passed in (rather than read from `new Date()`
// internally) for the same reason: purity and determinism in tests.
//
// Quality is the original 0-5 scale. The app's 4-level rating (Não lembrei/Foi difícil/Fui
// bem/Fácil demais) maps to it as 0/3/4/5 — that mapping lives at the call site, not here, so
// this module stays a faithful implementation of the published algorithm.

export type Sm2State = {
  repetitions: number
  intervalDays: number
  easeFactor: number
}

export type Sm2Result = Sm2State & { dueDate: string }

const INITIAL_EASE_FACTOR = 2.5
const MIN_EASE_FACTOR = 1.3

export const NEVER_REVIEWED: Sm2State = { repetitions: 0, intervalDays: 0, easeFactor: INITIAL_EASE_FACTOR }

// EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02)), floored at 1.3 (SM-2's own stated minimum —
// below that the algorithm becomes unstable, intervals stop growing in any meaningful way).
function nextEaseFactor(easeFactor: number, quality: number): number {
  const delta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
  return Math.max(MIN_EASE_FACTOR, easeFactor + delta)
}

// `state` is null for a card that has never been through the algorithm before — treated as
// starting from repetitions=0, interval=0, ease_factor=2.5 (see NEVER_REVIEWED), same as any
// fresh SM-2 card.
export function applySm2(state: Sm2State | null, quality: number, today: string): Sm2Result {
  if (quality < 0 || quality > 5) throw new Error(`quality deve estar entre 0 e 5, recebido: ${quality}`)

  const current = state ?? NEVER_REVIEWED
  const easeFactor = nextEaseFactor(current.easeFactor, quality)

  // Lapse (quality < 3, "Não lembrei"): the interval*EF progression restarts from scratch, but
  // the ease factor itself is only nudged down by the formula above (never slammed back to the
  // initial 2.5) — a card that's lapsed once should still be a little easier to schedule out
  // again than a genuinely brand-new one once it's relearned.
  if (quality < 3) {
    const intervalDays = 1
    return { repetitions: 1, intervalDays, easeFactor, dueDate: addDaysToDateString(today, intervalDays) }
  }

  // Interval growth uses the *pre-update* ease factor (current.easeFactor), matching the
  // original algorithm's order of operations: this repetition's interval is scheduled with the
  // ease factor earned by *past* performance, and only then does the ease factor itself move for
  // next time.
  const repetitions = current.repetitions + 1
  const intervalDays =
    repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(current.intervalDays * current.easeFactor)

  return { repetitions, intervalDays, easeFactor, dueDate: addDaysToDateString(today, intervalDays) }
}
