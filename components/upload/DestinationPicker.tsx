'use client'

import type { CSSProperties, MouseEvent } from 'react'
import type { CollectionOption } from '@/lib/collections-data'

export type DestinationValue =
  | { type: 'existing'; collectionId: string }
  | { type: 'new'; name: string }
  | { type: 'none' }

function optionStyle(selected: boolean, disabled: boolean): CSSProperties {
  return {
    padding: '13px 14px',
    background: 'var(--surface)',
    border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 16,
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }
}

function dotStyle(selected: boolean): CSSProperties {
  return {
    width: 18,
    height: 18,
    borderRadius: '50%',
    flexShrink: 0,
    border: selected ? '5px solid var(--accent)' : '2px solid var(--border)',
    background: 'var(--bg)',
  }
}

function stopPropagation(e: MouseEvent) {
  e.stopPropagation()
}

export function DestinationPicker({
  collections,
  value,
  onChange,
}: {
  collections: CollectionOption[]
  value: DestinationValue
  onChange: (value: DestinationValue) => void
}) {
  const hasCollections = collections.length > 0

  return (
    <div>
      <div className="text-[13px] font-bold" style={{ margin: '22px 0 10px' }}>
        Onde salvar os cards?
      </div>
      <div className="flex flex-col gap-2">
        <div
          onClick={() => {
            if (!hasCollections) return
            onChange({ type: 'existing', collectionId: value.type === 'existing' ? value.collectionId : collections[0].id })
          }}
          style={optionStyle(value.type === 'existing', !hasCollections)}
        >
          <div className="flex items-center gap-[11px]">
            <span style={dotStyle(value.type === 'existing')} />
            <span className="text-[13.5px] font-semibold">Adicionar a uma coleção existente</span>
          </div>
          {!hasCollections && (
            <div className="text-xs mt-1.5" style={{ color: 'var(--muted)', marginLeft: 29 }}>
              Nenhuma coleção criada ainda
            </div>
          )}
          {value.type === 'existing' && hasCollections && (
            <select
              value={value.collectionId}
              onChange={(e) => onChange({ type: 'existing', collectionId: e.target.value })}
              onClick={stopPropagation}
              className="w-full text-sm rounded-[11px]"
              style={{ marginTop: 11, padding: '11px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          )}
        </div>

        <div onClick={() => onChange({ type: 'new', name: value.type === 'new' ? value.name : '' })} style={optionStyle(value.type === 'new', false)}>
          <div className="flex items-center gap-[11px]">
            <span style={dotStyle(value.type === 'new')} />
            <span className="text-[13.5px] font-semibold">Criar nova coleção</span>
          </div>
          {value.type === 'new' && (
            <input
              autoFocus
              value={value.name}
              onChange={(e) => onChange({ type: 'new', name: e.target.value })}
              onClick={stopPropagation}
              placeholder="Nome da coleção"
              className="w-full text-sm rounded-[11px]"
              style={{ marginTop: 11, padding: '11px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
          )}
        </div>

        <div onClick={() => onChange({ type: 'none' })} style={optionStyle(value.type === 'none', false)}>
          <div className="flex items-center gap-[11px]">
            <span style={dotStyle(value.type === 'none')} />
            <span className="text-[13.5px] font-semibold">
              Deixar sem coleção <span style={{ color: 'var(--muted)', fontWeight: 500 }}>· decidir depois</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
