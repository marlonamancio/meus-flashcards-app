// Dependency-free on purpose (like lib/extraction/types.ts) — safe to import from client
// components for the quantity picker without pulling in @anthropic-ai/sdk.
export type GeneratedCard = { frente: string; verso: string }

export type Quantidade = { type: 'automatico' } | { type: 'manual'; count: number }

// Shared by the tema textarea (client, for maxLength/UX) and generateFromThemeAction (server, the
// actual enforcement) — a single source so the two can't drift apart.
export const MAX_TEMA_LENGTH = 500

// Same reasoning for quantidade.manual.count — QuantidadePicker.tsx clamps input against these,
// and app/(app)/upload/actions.ts re-validates against the exact same bounds server-side.
export const MIN_MANUAL_QUANTIDADE = 1
export const MAX_MANUAL_QUANTIDADE = 100
