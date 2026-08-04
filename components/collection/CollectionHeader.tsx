'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, MoreVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CollectionDetail, CollectionOption } from '@/lib/collections-data'
import { setCollectionParentAction } from '@/app/(app)/collection/[id]/actions'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'

export function CollectionHeader({ collection, eligibleParents }: { collection: CollectionDetail; eligibleParents: CollectionOption[] }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [name, setName] = useState(collection.nome)
  const [selectedParentId, setSelectedParentId] = useState<string | null>(collection.parentId)
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

  function openGroup() {
    setMenuOpen(false)
    setError(null)
    setSelectedParentId(collection.parentId)
    setGroupOpen(true)
  }

  async function handleSetParent() {
    setLoading(true)
    setError(null)

    const result = await setCollectionParentAction(collection.id, selectedParentId)

    setLoading(false)

    if (!result.ok) {
      setError(result.error)
      return
    }

    setGroupOpen(false)
    router.refresh()
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
                onClick={openGroup}
                className="w-full text-left text-[13.5px] font-semibold"
                style={{ padding: '12px 14px' }}
              >
                Agrupar em...
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

      <Modal open={groupOpen} onClose={() => setGroupOpen(false)}>
        <div className="text-[15px] font-bold mb-3">Agrupar &ldquo;{collection.nome}&rdquo; em...</div>
        <p className="text-[12.5px] mb-3" style={{ color: 'var(--muted)' }}>
          Sub-coleções têm um nível só: só coleções sem mãe podem virar mãe aqui.
        </p>
        <div className="flex flex-col gap-[6px]" style={{ maxHeight: 260, overflowY: 'auto' }}>
          <button
            onClick={() => setSelectedParentId(null)}
            className="w-full flex items-center justify-between text-left text-[13.5px] font-semibold rounded-xl"
            style={{
              padding: '11px 13px',
              background: selectedParentId === null ? 'var(--accent-soft)' : 'var(--surface-2)',
              border: selectedParentId === null ? '1.5px solid var(--accent)' : '1px solid var(--border)',
            }}
          >
            Nenhuma (coleção solta)
            {selectedParentId === null && <Check size={16} style={{ color: 'var(--accent-strong)' }} />}
          </button>
          {eligibleParents.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedParentId(option.id)}
              className="w-full flex items-center justify-between text-left text-[13.5px] font-semibold rounded-xl truncate"
              style={{
                padding: '11px 13px',
                background: selectedParentId === option.id ? 'var(--accent-soft)' : 'var(--surface-2)',
                border: selectedParentId === option.id ? '1.5px solid var(--accent)' : '1px solid var(--border)',
              }}
            >
              <span className="truncate">{option.nome}</span>
              {selectedParentId === option.id && <Check size={16} className="flex-none" style={{ color: 'var(--accent-strong)' }} />}
            </button>
          ))}
          {eligibleParents.length === 0 && (
            <div className="text-[13px] text-center" style={{ padding: '14px 4px', color: 'var(--muted)' }}>
              Nenhuma outra coleção disponível para virar mãe.
            </div>
          )}
        </div>
        {error && <Alert style={{ marginTop: 10 }}>{error}</Alert>}
        <div className="flex gap-[9px] mt-4">
          <button
            onClick={() => setGroupOpen(false)}
            className="flex-none rounded-xl text-[13.5px] font-semibold"
            style={{ padding: '11px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSetParent}
            disabled={loading || selectedParentId === collection.parentId}
            className="flex-1 rounded-xl text-[13.5px] font-semibold disabled:opacity-60"
            style={{ padding: 11, background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
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
