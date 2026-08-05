import type { ButtonHTMLAttributes } from 'react'

// Shared shell for the small round icon buttons scattered across focused-flow headers (BackHeader,
// BrowseSession's fechar/buscar/editar) — 38x38, rounded-[11px], var(--surface) background,
// var(--border) border. Extracted so new buttons of this same kind (e.g. the "Cards" list's search
// toggle) reuse one definition instead of a second, easy-to-drift-apart inline copy.
export function IconButton({ className, style, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`flex items-center justify-center rounded-[11px] flex-none ${className ?? ''}`.trim()}
      style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', ...style }}
    />
  )
}
