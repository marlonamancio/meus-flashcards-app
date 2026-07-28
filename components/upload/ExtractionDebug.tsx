'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Loader2, Upload as UploadIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { materialTipoFromFile } from '@/lib/extraction/material-tipo'
import { sanitizeFileName } from '@/lib/sanitize-filename'
import { registerMaterialAction } from '@/app/(app)/upload/actions'
import { Alert } from '@/components/ui/Alert'

type MaterialStatus = 'processando' | 'pronto' | 'erro'

type MaterialRow = {
  id: string
  nome: string
  tipo: string
  status: MaterialStatus
  conteudo_extraido: string[] | null
  erro_mensagem: string | null
}

const ACCEPTED = '.pdf,.jpg,.jpeg,.png,.webp,.docx,.pptx'
const MATERIAL_COLUMNS = 'id, nome, tipo, status, conteudo_extraido, erro_mensagem'
const MAX_MATERIAL_BYTES = 20 * 1024 * 1024
const MATERIALS_BUCKET = 'materiais'

// Temporary debug UI for Stage 1 (extraction only) — lets us confirm each file type produces
// coherent extracted text before Stage 2 (geração via IA) replaces this with the real flow.
//
// The file is uploaded straight from the browser to Supabase Storage (not through a Server
// Action/Route Handler): routing large files through our own server hits a Node/undici bug where
// `request.formData()` throws "Failed to parse body as FormData" for multipart bodies above
// ~11 MB, well under the 20 MB this app needs to support. Uploading client-side avoids that
// parser entirely; the server only ever receives the resulting storage path + metadata.
export function ExtractionDebug({ userId }: { userId: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [material, setMaterial] = useState<MaterialRow | null>(null)

  useEffect(() => {
    if (!material || material.status !== 'processando') return

    const supabase = createClient()
    const interval = setInterval(async () => {
      const { data } = await supabase.from('materials').select(MATERIAL_COLUMNS).eq('id', material.id).single()
      if (data) setMaterial(data as MaterialRow)
    }, 1500)

    return () => clearInterval(interval)
  }, [material])

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

  return (
    <div className="rounded-2xl" style={{ marginTop: 16, padding: 16, background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="text-xs font-bold uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.05em', marginBottom: 10 }}>
        Debug — extração (Estágio 1)
      </div>

      <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} />

      <button
        onClick={handlePickFile}
        disabled={isUploading}
        className="flex items-center justify-center gap-2 w-full rounded-2xl text-[14px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ padding: 13, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      >
        {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadIcon size={16} />}
        {isUploading ? 'Enviando...' : 'Enviar arquivo de teste'}
      </button>

      {error && <Alert style={{ marginTop: 12 }}>{error}</Alert>}

      {material && (
        <div className="rounded-xl" style={{ marginTop: 12, padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div className="text-[13px] font-semibold">{material.nome}</div>
          <div className="text-[11px] mt-1" style={{ color: 'var(--muted)' }}>
            tipo: {material.tipo} · status: {material.status}
          </div>

          {material.status === 'processando' && (
            <div className="flex items-center gap-2 text-[12px]" style={{ marginTop: 8, color: 'var(--muted)' }}>
              <Loader2 size={13} className="animate-spin" />
              Extraindo conteúdo...
            </div>
          )}

          {material.status === 'erro' && <Alert style={{ marginTop: 10 }}>{material.erro_mensagem ?? 'Erro na extração.'}</Alert>}

          {material.status === 'pronto' && material.conteudo_extraido && (
            <>
              <div className="text-[12px]" style={{ marginTop: 8, color: 'var(--good)' }}>
                {material.conteudo_extraido.length} chunk{material.conteudo_extraido.length === 1 ? '' : 's'} ·{' '}
                {material.conteudo_extraido.reduce((sum, chunk) => sum + chunk.length, 0)} caracteres
              </div>
              <pre
                className="text-[11px] overflow-x-auto overflow-y-auto rounded-lg whitespace-pre-wrap"
                style={{ marginTop: 8, padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)', maxHeight: 260 }}
              >
                {material.conteudo_extraido[0]?.slice(0, 2000)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  )
}
