// Raw preview of AI-generated cards — no edit UI here on purpose, that's Stage 3's review screen.
// Shared between the debug tools (ExtractionDebug, ThemeGenerationDebug) and the real "Gerar com
// IA" flow (GenerateWithAI).
export function GeneratedCardsPreview({ cards }: { cards: { frente: string; verso: string }[] }) {
  return (
    <>
      <div className="text-[12px]" style={{ marginTop: 8, color: 'var(--good)' }}>
        {cards.length} card{cards.length === 1 ? '' : 's'} gerado{cards.length === 1 ? '' : 's'} — aguardando revisão
      </div>
      <div className="flex flex-col gap-2" style={{ marginTop: 8, maxHeight: 320, overflowY: 'auto' }}>
        {cards.map((card, i) => (
          <div key={i} className="rounded-lg" style={{ padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div className="text-[12.5px] font-semibold">{card.frente}</div>
            <div className="text-[11.5px] mt-1" style={{ color: 'var(--muted)' }}>
              {card.verso}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
