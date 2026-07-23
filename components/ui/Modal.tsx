'use client'

import type { MouseEvent, ReactNode } from 'react'

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null

  function stopPropagation(e: MouseEvent) {
    e.stopPropagation()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ padding: 24, background: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-2xl"
        style={{ maxWidth: 360, padding: 18, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
        onClick={stopPropagation}
      >
        {children}
      </div>
    </div>
  )
}
