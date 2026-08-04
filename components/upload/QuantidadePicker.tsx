'use client'

import { MIN_MANUAL_QUANTIDADE, MAX_MANUAL_QUANTIDADE, type Quantidade } from '@/lib/generation/types'

const DEFAULT_MANUAL_COUNT = 15

export function QuantidadePicker({ value, onChange }: { value: Quantidade; onChange: (value: Quantidade) => void }) {
  return (
    <div>
      <div className="text-[13px] font-bold" style={{ margin: '22px 0 10px' }}>
        Quantos flashcards gerar?
      </div>
      <div className="flex gap-[9px]">
        <button
          type="button"
          onClick={() => onChange({ type: 'automatico' })}
          className="flex-1 text-left rounded-2xl"
          style={{
            padding: 13,
            background: value.type === 'automatico' ? 'var(--accent-soft)' : 'var(--surface)',
            border: `1.5px solid ${value.type === 'automatico' ? 'var(--accent)' : 'var(--border)'}`,
          }}
        >
          <div className="text-[13.5px] font-bold">Automático</div>
          <div className="text-[11px] mt-0.5" style={{ opacity: 0.8 }}>
            A IA decide pelo volume
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChange({ type: 'manual', count: value.type === 'manual' ? value.count : DEFAULT_MANUAL_COUNT })}
          className="flex-1 text-left rounded-2xl"
          style={{
            padding: 13,
            background: value.type === 'manual' ? 'var(--accent-soft)' : 'var(--surface)',
            border: `1.5px solid ${value.type === 'manual' ? 'var(--accent)' : 'var(--border)'}`,
          }}
        >
          <div className="text-[13.5px] font-bold">Escolher</div>
          <div className="text-[11px] mt-0.5" style={{ opacity: 0.8 }}>
            Defino a quantidade
          </div>
        </button>
      </div>

      {value.type === 'manual' && (
        <input
          type="number"
          min={MIN_MANUAL_QUANTIDADE}
          max={MAX_MANUAL_QUANTIDADE}
          value={value.count}
          onChange={(e) =>
            onChange({ type: 'manual', count: Math.min(MAX_MANUAL_QUANTIDADE, Math.max(MIN_MANUAL_QUANTIDADE, Number(e.target.value) || MIN_MANUAL_QUANTIDADE)) })
          }
          className="w-full text-sm rounded-[11px]"
          style={{ marginTop: 10, padding: '11px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
        />
      )}
    </div>
  )
}
