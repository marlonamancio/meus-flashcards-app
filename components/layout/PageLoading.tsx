import { Loader2 } from 'lucide-react'

// Loading fallback for the 5 main routes' loading.tsx (Home, Coleções, Collection detail,
// Progresso, Perfil) — same component everywhere, so a style change here reaches all of them
// (and the sub-routes that inherit their loading.tsx, e.g. estudar/navegar under
// collection/[id]) at once. See CLAUDE.md "Performance — auditoria de navegação lenta", "Estilo
// do indicador de loading (revisado)": the first version (a small Alert banner at the top) went
// unnoticed on fast transitions. This version is a large, centered overlay spanning the content
// area instead — the bottom nav stays visible regardless (loading.tsx's AppShell always renders
// it), so navigation itself never looks like it "disappeared".
export function PageLoading() {
  return (
    <div className="relative flex items-center justify-center rounded-2xl" style={{ minHeight: 'calc(100dvh - 102px)', marginTop: 8 }}>
      {/* 102px = AppShell's own top+bottom padding (6px + 96px), already reserved outside this
          panel for the bottom nav — so the dimmed area fills the rest of the viewport instead of
          leaving a stray empty gap above the nav. */}
      <div className="absolute inset-0 rounded-2xl" style={{ background: 'var(--surface-2)', opacity: 0.6 }} />
      <Loader2 size={40} strokeWidth={2} className="relative animate-spin" style={{ color: 'var(--accent-strong)' }} />
    </div>
  )
}
