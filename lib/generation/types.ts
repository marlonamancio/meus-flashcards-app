// Dependency-free on purpose (like lib/extraction/types.ts) — safe to import from client
// components for the quantity picker without pulling in @anthropic-ai/sdk.
export type GeneratedCard = { frente: string; verso: string }

export type Quantidade = { type: 'automatico' } | { type: 'manual'; count: number }
