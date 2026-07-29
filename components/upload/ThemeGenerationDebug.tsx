'use client'

import { useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { generateFromThemeAction } from '@/app/(app)/upload/actions'
import type { Quantidade } from '@/lib/generation/types'
import { Alert } from '@/components/ui/Alert'
import { QuantidadePicker } from '@/components/upload/QuantidadePicker'
import { GeneratedCardsPreview } from '@/components/upload/GeneratedCardsPreview'

type MaterialStatus = 'pronto' | 'gerando' | 'aguardando_revisao' | 'erro'

type MaterialRow = {
  id: string
  status: MaterialStatus
  cards_gerados: { frente: string; verso: string }[] | null
  erro_mensagem: string | null
}

const MATERIAL_COLUMNS = 'id, status, cards_gerados, erro_mensagem'

// Debug companion for the "Descrever um tema" generation path (see CLAUDE.md "Novo material
// (upload) — duas abas, três formas de gerar") — same reasoning as ExtractionDebug.tsx: quick
// manual verification without the polished review UI, which is Stage 3.
export function ThemeGenerationDebug() {
  const [tema, setTema] = useState('')
  const [quantidade, setQuantidade] = useState<Quantidade>({ type: 'automatico' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [material, setMaterial] = useState<MaterialRow | null>(null)

  useEffect(() => {
    if (!material || material.status !== 'gerando') return

    const supabase = createClient()
    const interval = setInterval(async () => {
      const { data } = await supabase.from('materials').select(MATERIAL_COLUMNS).eq('id', material.id).single()
      if (data) setMaterial(data as MaterialRow)
    }, 1500)

    return () => clearInterval(interval)
  }, [material])

  async function handleGenerate() {
    if (!tema.trim()) {
      setError('Descreva um tema.')
      return
    }
    setError(null)
    setMaterial(null)
    setIsSubmitting(true)

    const result = await generateFromThemeAction(tema, quantidade)
    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    const supabase = createClient()
    const { data } = await supabase.from('materials').select(MATERIAL_COLUMNS).eq('id', result.materialId).single()
    if (data) setMaterial(data as MaterialRow)
  }

  return (
    <div className="rounded-2xl" style={{ marginTop: 16, padding: 16, background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-xs font-bold uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 10 }}>
        Debug — geração por tema livre (Estágio 2)
      </div>

      <textarea
        value={tema}
        onChange={(e) => setTema(e.target.value)}
        placeholder="Ex: Princípios do Direito Administrativo"
        rows={3}
        className="w-full text-sm rounded-[11px]"
        style={{ padding: '11px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', resize: 'vertical' }}
      />

      <Alert style={{ marginTop: 10 }}>
        Cards gerados por tema livre não têm fonte de referência sua e podem conter imprecisões da IA — merecem revisão mais
        atenta que os gerados a partir de material enviado.
      </Alert>

      <QuantidadePicker value={quantidade} onChange={setQuantidade} />

      <button
        onClick={handleGenerate}
        disabled={isSubmitting}
        className="flex items-center justify-center gap-2 w-full rounded-2xl text-[14px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ marginTop: 14, padding: 13, background: 'var(--accent)', color: 'var(--on-accent)' }}
      >
        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
        {isSubmitting ? 'Iniciando...' : 'Gerar flashcards'}
      </button>

      {error && <Alert style={{ marginTop: 12 }}>{error}</Alert>}

      {material?.status === 'gerando' && (
        <div className="flex items-center gap-2 text-[12px]" style={{ marginTop: 10, color: 'var(--muted)' }}>
          <Loader2 size={13} className="animate-spin" />
          Gerando flashcards...
        </div>
      )}

      {material?.status === 'erro' && <Alert style={{ marginTop: 10 }}>{material.erro_mensagem ?? 'Erro na geração.'}</Alert>}

      {material?.status === 'aguardando_revisao' && material.cards_gerados && (
        <GeneratedCardsPreview cards={material.cards_gerados} />
      )}
    </div>
  )
}
