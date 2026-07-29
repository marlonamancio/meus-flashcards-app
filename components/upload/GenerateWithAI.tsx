'use client'

import { useEffect, useRef, useState, type ChangeEvent, type CSSProperties } from 'react'
import { Loader2, Sparkles, Upload as UploadIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { materialTipoFromFile } from '@/lib/extraction/material-tipo'
import { sanitizeFileName } from '@/lib/sanitize-filename'
import { registerMaterialAction, generateFromMaterialAction, generateFromThemeAction } from '@/app/(app)/upload/actions'
import type { Quantidade } from '@/lib/generation/types'
import { Alert } from '@/components/ui/Alert'
import { QuantidadePicker } from '@/components/upload/QuantidadePicker'
import { GeneratedCardsPreview } from '@/components/upload/GeneratedCardsPreview'

type MaterialStatus = 'processando' | 'pronto' | 'gerando' | 'aguardando_revisao' | 'erro'

type MaterialRow = {
  id: string
  status: MaterialStatus
  cards_gerados: { frente: string; verso: string }[] | null
  erro_mensagem: string | null
}

type Source = 'arquivo' | 'tema'

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp,.docx,.pptx'
const MATERIAL_COLUMNS = 'id, status, cards_gerados, erro_mensagem'
const MAX_MATERIAL_BYTES = 20 * 1024 * 1024
const MATERIALS_BUCKET = 'materiais'
const POLLING_STATUSES: MaterialStatus[] = ['processando', 'gerando']

// Deliberately lighter than the primary "Gerar com IA"/"Importar CSV" tabs (UploadView.tsx) —
// this is a secondary choice subordinate to that one, not a competing segmented control: no
// solid fill, thin border, content-sized chips instead of a full-width block. See CLAUDE.md
// "Novo material (upload)" → "Hierarquia visual".
const activeSourceStyle: CSSProperties = { padding: '7px 13px', background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent-strong)' }
const inactiveSourceStyle: CSSProperties = { padding: '7px 13px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)' }

// The file is uploaded straight from the browser to Supabase Storage, not through a Server
// Action/Route Handler — see registerMaterialAction in app/(app)/upload/actions.ts for why
// (Node/undici breaks on multipart bodies well under the 20 MB this app needs to support).
export function GenerateWithAI({ userId }: { userId: string }) {
  const [source, setSource] = useState<Source>('arquivo')
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [material, setMaterial] = useState<MaterialRow | null>(null)
  const [tema, setTema] = useState('')
  const [quantidade, setQuantidade] = useState<Quantidade>({ type: 'automatico' })

  useEffect(() => {
    if (!material || !POLLING_STATUSES.includes(material.status)) return

    const supabase = createClient()
    const interval = setInterval(async () => {
      const { data } = await supabase.from('materials').select(MATERIAL_COLUMNS).eq('id', material.id).single()
      if (data) setMaterial(data as MaterialRow)
    }, 1500)

    return () => clearInterval(interval)
  }, [material])

  function handleSourceChange(next: Source) {
    setSource(next)
    setMaterial(null)
    setError(null)
  }

  function handlePickFile() {
    inputRef.current?.click()
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError(null)
    setMaterial(null)

    if (file.size === 0) {
      setError('O arquivo está vazio.')
      return
    }
    if (file.size > MAX_MATERIAL_BYTES) {
      setError('O arquivo excede o limite de 20 MB.')
      return
    }
    const tipo = materialTipoFromFile(file.type, file.name)
    if (!tipo) {
      setError('Formato não suportado. Envie PDF, imagem (JPEG/PNG/WEBP), Word (.docx) ou PowerPoint (.pptx).')
      return
    }

    setIsUploading(true)

    const supabase = createClient()
    const storagePath = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`

    const { error: uploadError } = await supabase.storage
      .from(MATERIALS_BUCKET)
      .upload(storagePath, file, { contentType: file.type || undefined, upsert: false })

    if (uploadError) {
      setIsUploading(false)
      setError('Não foi possível enviar o arquivo.')
      return
    }

    const result = await registerMaterialAction({ storagePath, nome: file.name, mimeType: file.type })
    setIsUploading(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    const { data } = await supabase.from('materials').select(MATERIAL_COLUMNS).eq('id', result.materialId).single()
    if (data) setMaterial(data as MaterialRow)
  }

  async function refreshMaterial(materialId: string) {
    const supabase = createClient()
    const { data } = await supabase.from('materials').select(MATERIAL_COLUMNS).eq('id', materialId).single()
    if (data) setMaterial(data as MaterialRow)
  }

  async function handleGenerateFromFile() {
    if (!material) return
    setIsSubmitting(true)
    const result = await generateFromMaterialAction(material.id, quantidade)
    setIsSubmitting(false)

    if (!result.ok) {
      setError(result.error)
      return
    }
    await refreshMaterial(material.id)
  }

  async function handleGenerateFromTheme() {
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
    await refreshMaterial(result.materialId)
  }

  const isBusy = isUploading || isSubmitting
  const showQuantidadeAndButton = source === 'arquivo' ? material?.status === 'pronto' : !material || material.status === 'erro'

  return (
    <>
      <div className="text-[11px] font-bold uppercase" style={{ marginTop: 18, marginBottom: 7, letterSpacing: '0.04em', color: 'var(--muted)' }}>
        Origem do conteúdo
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleSourceChange('arquivo')}
          className="flex items-center justify-center gap-1.5 rounded-full text-[12.5px] font-semibold"
          style={source === 'arquivo' ? activeSourceStyle : inactiveSourceStyle}
        >
          <UploadIcon size={13} strokeWidth={2} />
          Enviar arquivo
        </button>
        <button
          type="button"
          onClick={() => handleSourceChange('tema')}
          className="flex items-center justify-center gap-1.5 rounded-full text-[12.5px] font-semibold"
          style={source === 'tema' ? activeSourceStyle : inactiveSourceStyle}
        >
          <Sparkles size={13} strokeWidth={2} />
          Descrever um tema
        </button>
      </div>

      {source === 'arquivo' ? (
        <>
          <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} />

          {!material && (
            <div
              onClick={isUploading ? undefined : handlePickFile}
              className="text-center rounded-[18px]"
              style={{ marginTop: 14, padding: '26px 18px', border: '1.7px dashed var(--border)', background: 'var(--surface)', cursor: isUploading ? 'default' : 'pointer' }}
            >
              <div
                className="flex items-center justify-center rounded-2xl mx-auto"
                style={{ width: 48, height: 48, marginBottom: 12, background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
              >
                {isUploading ? <Loader2 size={24} className="animate-spin" /> : <UploadIcon size={24} strokeWidth={1.9} />}
              </div>
              <div className="text-[14.5px] font-semibold">{isUploading ? 'Enviando...' : 'Toque para enviar arquivos'}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                PDF, imagem, Word ou PowerPoint · até 20 MB
              </div>
            </div>
          )}

          {material?.status === 'processando' && (
            <Alert
              tone="accent"
              icon={<Loader2 size={16} strokeWidth={2.2} className="animate-spin" style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-strong)' }} />}
              style={{ marginTop: 14 }}
            >
              Extraindo conteúdo do material...
            </Alert>
          )}
        </>
      ) : (
        <>
          <textarea
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Ex: Princípios do Direito Administrativo"
            rows={3}
            disabled={isBusy}
            className="w-full text-sm rounded-[14px]"
            style={{ marginTop: 14, padding: '13px 14px', background: 'var(--surface)', border: '1.5px solid var(--border)', color: 'var(--text)', resize: 'vertical' }}
          />
          <Alert style={{ marginTop: 10 }}>
            Cards gerados por tema livre não têm fonte de referência sua e podem conter imprecisões da IA — merecem revisão
            mais atenta que os gerados a partir de material enviado.
          </Alert>
        </>
      )}

      {error && <Alert style={{ marginTop: 12 }}>{error}</Alert>}

      {showQuantidadeAndButton && (
        <>
          <QuantidadePicker value={quantidade} onChange={setQuantidade} />
          <button
            onClick={source === 'arquivo' ? handleGenerateFromFile : handleGenerateFromTheme}
            disabled={isBusy}
            className="flex items-center justify-center gap-2 w-full rounded-2xl text-[15.5px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ marginTop: 24, padding: 15, color: 'var(--on-accent)', background: 'var(--accent)', boxShadow: '0 8px 20px var(--accent-soft)' }}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} strokeWidth={2} />}
            {isSubmitting ? 'Iniciando...' : 'Gerar flashcards'}
          </button>
        </>
      )}

      {material?.status === 'gerando' && (
        <Alert
          tone="accent"
          icon={<Loader2 size={16} strokeWidth={2.2} className="animate-spin" style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-strong)' }} />}
          style={{ marginTop: 16 }}
        >
          Gerando flashcards — pode levar até 2 minutos para materiais grandes.
        </Alert>
      )}

      {material?.status === 'erro' && <Alert style={{ marginTop: 14 }}>{material.erro_mensagem ?? 'Erro na geração.'}</Alert>}

      {material?.status === 'aguardando_revisao' && material.cards_gerados && (
        <div style={{ marginTop: 16 }}>
          <GeneratedCardsPreview cards={material.cards_gerados} />
        </div>
      )}
    </>
  )
}
