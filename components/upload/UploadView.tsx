'use client'

import { useState, type CSSProperties } from 'react'
import { FileSpreadsheet, Sparkles } from 'lucide-react'
import type { CollectionOption } from '@/lib/collections-data'
import { CsvImportTab } from '@/components/upload/CsvImportTab'
import { GenerateWithAI } from '@/components/upload/GenerateWithAI'

const activeSegStyle: CSSProperties = { padding: 10, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }
const inactiveSegStyle: CSSProperties = { padding: 10, color: 'var(--muted)' }

export function UploadView({ collections, userId }: { collections: CollectionOption[]; userId: string }) {
  const [tab, setTab] = useState<'ia' | 'csv'>('ia')

  return (
    <>
      <div className="flex gap-1.5 rounded-2xl" style={{ padding: 4, marginTop: 16, background: 'var(--surface-2)' }}>
        <button
          onClick={() => setTab('ia')}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold"
          style={tab === 'ia' ? activeSegStyle : inactiveSegStyle}
        >
          <Sparkles size={15} strokeWidth={2} />
          Gerar com IA
        </button>
        <button
          onClick={() => setTab('csv')}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold"
          style={tab === 'csv' ? activeSegStyle : inactiveSegStyle}
        >
          <FileSpreadsheet size={15} strokeWidth={2} />
          Importar CSV
        </button>
      </div>

      {tab === 'ia' ? <GenerateWithAI userId={userId} /> : <CsvImportTab collections={collections} />}
    </>
  )
}
