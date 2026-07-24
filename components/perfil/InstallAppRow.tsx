'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronRight, Download } from 'lucide-react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallAppRow() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    // One-time read of a browser-only API (matchMedia) on mount with an empty dependency
    // array — not the cascading-render pattern this rule targets, since it can only ever run
    // once. No hydration risk either: the initial `false` is a plain literal, identical on
    // server and client, unlike useTheme.ts's case where the *initializer itself* read a
    // browser value during render.
    if (window.matchMedia('(display-mode: standalone)').matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInstalled(true)
    }

    function handleBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    function handleAppInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function handleClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
      return
    }
    setShowInstructions((v) => !v)
  }

  if (installed) {
    return (
      <div
        className="flex items-center gap-3 rounded-2xl"
        style={{ padding: 15, background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Check size={19} strokeWidth={2.2} style={{ color: 'var(--good)' }} />
        <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          App já instalado
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        className="flex items-center gap-3 rounded-2xl w-full text-left"
        style={{ padding: 15, background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Download size={19} strokeWidth={1.9} style={{ color: 'var(--muted)' }} />
        <span className="flex-1 text-sm font-semibold">Instalar o app</span>
        <ChevronRight size={17} style={{ color: 'var(--muted)' }} />
      </button>
      {showInstructions && !deferredPrompt && (
        <div className="text-xs rounded-2xl" style={{ padding: '12px 14px', background: 'var(--surface-2)', color: 'var(--muted)', lineHeight: 1.5 }}>
          Use o menu do navegador (⋮ ou o ícone de compartilhar) e escolha &ldquo;Adicionar à tela inicial&rdquo; ou &ldquo;Instalar
          app&rdquo;.
        </div>
      )}
    </div>
  )
}
