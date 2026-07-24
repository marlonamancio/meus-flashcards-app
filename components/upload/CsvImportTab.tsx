'use client'

import { useRef, useState, useTransition, type ChangeEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Download, FileSpreadsheet, Loader2, X } from 'lucide-react'
import type { CollectionOption } from '@/lib/collections-data'
import { parseCsvPreview } from '@/lib/csv-preview'
import { importCsvAction, type ImportSummary } from '@/app/(app)/upload/actions'
import { DestinationPicker, type DestinationValue } from '@/components/upload/DestinationPicker'
import { Alert } from '@/components/ui/Alert'

const MAX_CSV_BYTES = 5 * 1024 * 1024
const TEMPLATE_CSV =
  'frente,verso\r\nO que é habeas corpus?,Remédio constitucional que protege o direito de locomoção.\r\nQual é a capital do Brasil?,Brasília\r\n'

export function CsvImportTab({ collections }: { collections: CollectionOption[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ front: string; back: string }[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [destination, setDestination] = useState<DestinationValue>({ type: 'none' })
  const [fileError, setFileError] = useState<string | null>(null)
  const [destinationError, setDestinationError] = useState<string | null>(null)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [isPending, startTransition] = useTransition()

  function handlePickFile() {
    inputRef.current?.click()
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    e.target.value = ''
    if (!selected) return

    if (!selected.name.toLowerCase().endsWith('.csv')) {
      setFileError('Envie um arquivo .csv.')
      return
    }
    if (selected.size > MAX_CSV_BYTES) {
      setFileError('O arquivo excede o limite de 5 MB.')
      return
    }

    setFileError(null)
    const text = await selected.text()
    const parsed = parseCsvPreview(text)
    setFile(selected)
    setPreview(parsed.rows.slice(0, 3))
    setRowCount(parsed.rows.length)
  }

  function handleRemoveFile() {
    setFile(null)
    setPreview([])
    setRowCount(0)
    setFileError(null)
  }

  function handleDownloadTemplate() {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo-flashcards.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport() {
    if (!file) return

    setFileError(null)
    setDestinationError(null)

    if (destination.type === 'new' && !destination.name.trim()) {
      setDestinationError('Informe um nome para a nova coleção.')
      return
    }

    const formData = new FormData()
    formData.set('file', file)
    formData.set('destinationType', destination.type)
    if (destination.type === 'existing') formData.set('destinationCollectionId', destination.collectionId)
    if (destination.type === 'new') formData.set('destinationName', destination.name.trim())

    startTransition(async () => {
      const result = await importCsvAction(formData)
      if (!result.ok) {
        // Every failure importCsvAction can return is about the file/content itself (bad
        // header, empty file, malformed rows...) — destination failures are surfaced as a
        // `warning` on a successful summary instead, so this always belongs near the dropzone.
        setFileError(result.error)
        return
      }
      setSummary(result.summary)
      handleRemoveFile()
      router.refresh()
    })
  }

  function handleImportAnother() {
    setSummary(null)
    setDestination({ type: 'none' })
  }

  if (summary) {
    return <ImportSummaryView summary={summary} onImportAnother={handleImportAnother} />
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />

      <div
        onClick={handlePickFile}
        className="text-center rounded-[18px]"
        style={{ padding: '26px 18px', border: '1.7px dashed var(--border)', background: 'var(--surface)', cursor: 'pointer' }}
      >
        <div
          className="flex items-center justify-center rounded-2xl mx-auto"
          style={{ width: 48, height: 48, marginBottom: 12, background: 'var(--good-soft)', color: 'var(--good)' }}
        >
          <FileSpreadsheet size={24} strokeWidth={1.9} />
        </div>
        <div className="text-[14.5px] font-semibold">Toque para enviar um arquivo CSV</div>
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
          Cada linha vira um flashcard · até 5 MB
        </div>
      </div>

      {fileError && <Alert style={{ marginTop: 10 }}>{fileError}</Alert>}

      <div className="rounded-2xl" style={{ marginTop: 14, padding: '13px 15px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <div className="text-xs font-bold uppercase" style={{ letterSpacing: '0.04em', color: 'var(--muted)' }}>
          Formato esperado
        </div>
        <div className="text-[12.5px] mt-1.5" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
          Duas colunas com cabeçalho: <b style={{ color: 'var(--text)' }}>frente</b> e <b style={{ color: 'var(--text)' }}>verso</b>. Separador
          vírgula ou ponto-e-vírgula.
        </div>
        <pre
          className="text-[11px] mt-2.5 overflow-x-auto rounded-[9px]"
          style={{ padding: '10px 12px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)', lineHeight: 1.7 }}
        >
{`frente,verso
O que é habeas corpus?,Remédio...
Função do advérbio?,Modificar...`}
        </pre>
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-[7px] rounded-full text-xs font-bold"
          style={{ marginTop: 10, padding: '8px 12px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
        >
          <Download size={14} />
          Baixar modelo
        </button>
      </div>

      {file && (
        <>
          <div className="flex items-center gap-3 rounded-2xl" style={{ padding: 12, marginTop: 14, background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div
              className="flex-none flex items-center justify-center rounded-[9px] text-[10px] font-bold"
              style={{ width: 36, height: 36, background: 'var(--good-soft)', color: 'var(--good)' }}
            >
              CSV
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold truncate">{file.name}</div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--good)' }}>
                {rowCount} card{rowCount === 1 ? '' : 's'} prontos para importar
              </div>
            </div>
            <button
              onClick={handleRemoveFile}
              aria-label="Remover arquivo"
              className="flex-none flex items-center justify-center rounded-lg"
              style={{ width: 28, height: 28, color: 'var(--muted)' }}
            >
              <X size={16} />
            </button>
          </div>

          {preview.length > 0 && (
            <>
              <div className="text-xs font-bold uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.05em', margin: '16px 0 8px' }}>
                Prévia
              </div>
              <div className="flex flex-col gap-2">
                {preview.map((row, i) => (
                  <div key={i} className="rounded-[13px]" style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="text-[13.5px] font-semibold" style={{ lineHeight: 1.4 }}>
                      {row.front}
                    </div>
                    <div className="text-[12.5px] mt-1" style={{ color: 'var(--muted)', lineHeight: 1.45 }}>
                      {row.back}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <DestinationPicker collections={collections} value={destination} onChange={setDestination} />

      {destinationError && <Alert style={{ marginTop: 12 }}>{destinationError}</Alert>}

      <button
        onClick={handleImport}
        disabled={!file || isPending}
        className="flex items-center justify-center gap-2 w-full rounded-2xl text-[15.5px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ marginTop: 24, padding: 15, color: 'var(--on-accent)', background: 'var(--accent)', boxShadow: '0 8px 20px var(--accent-soft)' }}
      >
        {isPending ? <Loader2 size={18} className="animate-spin" /> : <FileSpreadsheet size={18} strokeWidth={2} />}
        {isPending ? 'Importando...' : 'Importar cards'}
      </button>
    </>
  )
}

function ImportSummaryView({ summary, onImportAnother }: { summary: ImportSummary; onImportAnother: () => void }) {
  return (
    <div className="rounded-2xl" style={{ marginTop: 16, padding: 20, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      <div
        className="flex items-center justify-center rounded-2xl mx-auto"
        style={{ width: 52, height: 52, marginBottom: 14, background: 'var(--good-soft)', color: 'var(--good)' }}
      >
        <Check size={26} strokeWidth={2.2} />
      </div>
      <div className="text-center text-[17px] font-bold">Importação concluída</div>

      <div className="flex gap-[9px] mt-4">
        <div className="flex-1 rounded-2xl text-center" style={{ padding: 14, background: 'var(--good-soft)' }}>
          <div className="text-[22px] font-bold" style={{ color: 'var(--good)' }}>
            {summary.importedCount}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
            importados
          </div>
        </div>
        <div className="flex-1 rounded-2xl text-center" style={{ padding: 14, background: summary.skippedCount > 0 ? 'var(--bad-soft)' : 'var(--surface-2)' }}>
          <div className="text-[22px] font-bold" style={{ color: summary.skippedCount > 0 ? 'var(--bad)' : 'var(--text)' }}>
            {summary.skippedCount}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
            ignorados
          </div>
        </div>
      </div>

      {summary.skippedReasons.length > 0 && (
        <Alert style={{ marginTop: 14, alignItems: 'flex-start' }}>
          <div className="font-bold mb-1.5">Linhas ignoradas</div>
          <ul style={{ lineHeight: 1.6 }}>
            {summary.skippedReasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </Alert>
      )}

      {summary.warning && <Alert style={{ marginTop: 12 }}>{summary.warning}</Alert>}

      {summary.collectionName && !summary.warning && (
        <div className="text-[13px] mt-4" style={{ color: 'var(--muted)' }}>
          Adicionados à coleção <b style={{ color: 'var(--text)' }}>{summary.collectionName}</b>.
        </div>
      )}

      <div className="flex flex-col gap-2 mt-5">
        {summary.collectionId && (
          <Link
            href={`/collection/${summary.collectionId}`}
            className="text-center rounded-2xl text-[14.5px] font-semibold"
            style={{ padding: 14, background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            Ver coleção
          </Link>
        )}
        <Link
          href="/colecoes"
          className="text-center rounded-2xl text-[14.5px] font-semibold"
          style={{ padding: 14, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          Ver todas as coleções
        </Link>
        <button onClick={onImportAnother} className="text-center rounded-2xl text-[13.5px] font-semibold" style={{ padding: 12, color: 'var(--muted)' }}>
          Importar outro CSV
        </button>
      </div>
    </div>
  )
}
