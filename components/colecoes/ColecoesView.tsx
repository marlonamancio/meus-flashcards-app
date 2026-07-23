'use client'

import { useMemo, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Inbox, Plus, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { CollectionSummary } from '@/lib/home-data'
import { HeaderTitle } from '@/components/layout/HeaderTitle'

export function ColecoesView({
  collections,
  unsortedCount,
  userId,
}: {
  collections: CollectionSummary[]
  unsortedCount: number
  userId: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return collections
    return collections.filter((c) => c.nome.toLowerCase().includes(q))
  }, [collections, query])

  function closeCreate() {
    setCreateOpen(false)
    setName('')
    setError(null)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: insertError } = await supabase.from('collections').insert({ user_id: userId, nome: trimmed })

    setLoading(false)

    if (insertError) {
      setError('Não foi possível criar a coleção. Tente novamente.')
      return
    }

    closeCreate()
    router.refresh()
  }

  return (
    <>
      <div className="flex justify-between items-center" style={{ padding: '18px 0 2px' }}>
        <HeaderTitle title="Coleções" />
        <button
          aria-label="Nova coleção"
          onClick={() => setCreateOpen((v) => !v)}
          className="flex items-center justify-center rounded-xl flex-none"
          style={{ width: 40, height: 40, background: 'var(--accent)', color: 'var(--on-accent)', boxShadow: '0 6px 16px var(--accent-soft)' }}
        >
          <Plus size={22} strokeWidth={2.6} />
        </button>
      </div>

      <div className="relative mt-3.5">
        <Search size={18} className="absolute" style={{ left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar coleção"
          className="w-full text-sm rounded-[13px]"
          style={{ padding: '12px 14px 12px 40px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
      </div>

      {createOpen && (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl"
          style={{ marginTop: 12, padding: 14, background: 'var(--surface)', border: '1.5px solid var(--accent)', boxShadow: 'var(--shadow)' }}
        >
          <div className="text-[13px] font-bold mb-[9px]">Nova coleção</div>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Direito Tributário"
            className="w-full text-sm rounded-[11px]"
            style={{ padding: 12, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          {error && (
            <p className="text-xs mt-2" style={{ color: 'var(--bad)' }}>
              {error}
            </p>
          )}
          <div className="flex gap-[9px] mt-[10px]">
            <button
              type="button"
              onClick={closeCreate}
              className="flex-none rounded-[11px] text-[13.5px] font-semibold"
              style={{ padding: '11px 16px', background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="flex-1 rounded-[11px] text-[13.5px] font-semibold disabled:opacity-60"
              style={{ padding: 11, background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {loading ? 'Criando...' : 'Criar coleção'}
            </button>
          </div>
        </form>
      )}

      {unsortedCount > 0 && (
        <div
          className="flex items-center gap-[14px] rounded-2xl"
          style={{ padding: '14px 13px', marginTop: 14, background: 'var(--surface-2)', border: '1px dashed var(--border)' }}
        >
          <div
            className="flex items-center justify-center rounded-xl flex-none"
            style={{ width: 44, height: 44, background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            <Inbox size={20} strokeWidth={1.8} />
          </div>
          <div className="flex-1">
            <div className="text-[14.5px] font-semibold">Não organizados</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {unsortedCount} card{unsortedCount === 1 ? '' : 's'} sem coleção
            </div>
          </div>
        </div>
      )}

      <div
        className="text-[11.5px] font-bold uppercase"
        style={{ color: 'var(--muted)', letterSpacing: '0.06em', margin: '22px 0 11px' }}
      >
        Todas · {collections.length}
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-2xl text-center"
          style={{ padding: '28px 16px', background: 'var(--surface)', border: '1px dashed var(--border)', color: 'var(--muted)', fontSize: 13.5 }}
        >
          {collections.length === 0 ? 'Nenhuma coleção ainda. Toque em + para criar a primeira.' : 'Nenhuma coleção encontrada.'}
        </div>
      ) : (
        <div className="flex flex-col gap-[9px]">
          {filtered.map((col) => (
            <Link
              key={col.id}
              href={`/collection/${col.id}`}
              className="flex items-center gap-[14px] rounded-[16px]"
              style={{ padding: 13, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
            >
              <div
                className="flex-none flex items-center justify-center rounded-[12px] text-[15px] font-bold"
                style={{ width: 44, height: 44, background: col.soft, color: col.color }}
              >
                {col.short}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[14.5px] font-semibold truncate" style={{ letterSpacing: '-0.01em' }}>
                  {col.nome}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {col.cardCount} card{col.cardCount === 1 ? '' : 's'} · {col.accuracyPct !== null ? `${col.accuracyPct}%` : '—'}
                </div>
              </div>
              <ChevronRight size={18} className="flex-none" style={{ color: 'var(--muted)' }} />
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
