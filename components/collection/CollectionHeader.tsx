'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CollectionDetail } from '@/lib/collections-data'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'

export function CollectionHeader({ collection }: { collection: CollectionDetail }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [name, setName] = useState(collection.nome)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function openRename() {
    setMenuOpen(false)
    setName(collection.nome)
    setError(null)
    setRenameOpen(true)
  }

  function openDelete() {
    setMenuOpen(false)
    setError(null)
    setDeleteOpen(true)
  }

  async function handleRename(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase.from('collections').update({ nome: trimmed }).eq('id', collection.id)

    setLoading(false)

    if (updateError) {
      setError('Não foi possível renomear. Tente novamente.')
      return
    }

    setRenameOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: deleteError } = await supabase.from('collections').delete().eq('id', collection.id)

    setLoading(false)

    if (deleteError) {
      setError('Não foi possível apagar. Tente novamente.')
      return
    }

    router.push('/colecoes')
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center relative" style={{ padding: '10px 0 6px' }}>
        <Link
          href="/colecoes"
          aria-label="Voltar"
          className="flex items-center justify-center rounded-[11px] flex-none"
          style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <ArrowLeft size={19} strokeWidth={2.2} />
        </Link>
        <div className="flex-1" />
        <button
          aria-label="Mais opções"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center justify-center rounded-[11px] flex-none"
          style={{ width: 38, height: 38, background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
        >
          <MoreVertical size={18} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div
              className="absolute right-0 z-20 rounded-2xl overflow-hidden"
              style={{ top: 44, minWidth: 172, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
            >
              <button
                onClick={openRename}
                className="w-full text-left text-[13.5px] font-semibold"
                style={{ padding: '12px 14px' }}
              >
                Renomear
              </button>
              <button
                onClick={openDelete}
                className="w-full text-left text-[13.5px] font-semibold"
                style={{ padding: '12px 14px', color: 'var(--bad)' }}
              >
                Apagar coleção
              </button>
            </div>
          </>
        )}
      </div>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)}>
        <form onSubmit={handleRename}>
          <div className="text-[15px] font-bold mb-3">Renomear coleção</div>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm rounded-xl"
            style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          {error && <Alert style={{ marginTop: 8 }}>{error}</Alert>}
          <div className="flex gap-[9px] mt-4">
            <button
              type="button"
              onClick={() => setRenameOpen(false)}
              className="flex-none rounded-xl text-[13.5px] font-semibold"
              style={{ padding: '11px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 rounded-xl text-[13.5px] font-semibold disabled:opacity-60"
              style={{ padding: 11, background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <div className="text-[15px] font-bold mb-2">Apagar &ldquo;{collection.nome}&rdquo;?</div>
        <p className="text-[13px]" style={{ color: 'var(--muted)' }}>
          Os flashcards desta coleção não serão excluídos — eles voltam para &ldquo;Não organizados&rdquo; se não estiverem em outra coleção.
        </p>
        {error && <Alert style={{ marginTop: 8 }}>{error}</Alert>}
        <div className="flex gap-[9px] mt-4">
          <button
            onClick={() => setDeleteOpen(false)}
            className="flex-1 rounded-xl text-[13.5px] font-semibold"
            style={{ padding: 11, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-xl text-[13.5px] font-semibold disabled:opacity-60"
            style={{ padding: 11, background: 'var(--bad)', color: '#fff' }}
          >
            {loading ? 'Apagando...' : 'Apagar'}
          </button>
        </div>
      </Modal>
    </>
  )
}
