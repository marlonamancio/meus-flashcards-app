'use client'

import { useState } from 'react'
import { ChevronRight, ExternalLink, Info } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { LogoMark } from '@/components/layout/LogoMark'

export function AboutAppSection() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 rounded-2xl w-full text-left"
        style={{ padding: 15, background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <Info size={19} strokeWidth={1.9} style={{ color: 'var(--muted)' }} />
        <span className="flex-1 text-sm font-semibold">Sobre o Meus Flashcards</span>
        <ChevronRight size={17} style={{ color: 'var(--muted)' }} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)}>
        <div className="flex flex-col items-center text-center gap-3">
          <LogoMark size={52} />
          <div>
            <div className="text-[16px] font-bold">Meus Flashcards AI</div>
            <p className="text-[13px] mt-2" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
              App de flashcards com geração automática via IA a partir de material de estudo, além de importação de
              cards já criados via CSV. Projeto pessoal, em desenvolvimento como MVP.
            </p>
          </div>
          <a
            href="https://github.com/marlonamancio/meus-flashcards-app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[13.5px] font-semibold mt-1"
            style={{ color: 'var(--accent)' }}
          >
            Ver repositório no GitHub
            <ExternalLink size={14} strokeWidth={2.2} />
          </a>
        </div>

        <button
          onClick={() => setOpen(false)}
          className="w-full rounded-xl text-[13.5px] font-semibold mt-5"
          style={{ padding: 11, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          Fechar
        </button>
      </Modal>
    </>
  )
}
