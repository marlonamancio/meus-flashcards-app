// Small worker-pool runner instead of Promise.all: caps how many `tasks` are ever in flight at
// once while still running everything that fits concurrently. Results land at their original
// index regardless of finishing order, so callers never need to re-sort — task N's outcome is
// always outcomes[N]. Shared between PDF vision batching (lib/extraction/pdf.ts) and flashcard
// generation (lib/generation/index.ts) — same bounded-parallelism pattern, same reasoning: keep
// wall-clock time close to the slowest single call instead of the sum of all of them, without
// bursting past the Anthropic account's rate limit.
export async function runWithConcurrencyLimit<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<PromiseSettledResult<T>[]> {
  const outcomes: PromiseSettledResult<T>[] = new Array(tasks.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < tasks.length) {
      const current = nextIndex++
      try {
        outcomes[current] = { status: 'fulfilled', value: await tasks[current]() }
      } catch (reason) {
        outcomes[current] = { status: 'rejected', reason }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  return outcomes
}
