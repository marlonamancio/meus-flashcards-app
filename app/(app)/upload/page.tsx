import { Sparkles, Upload as UploadIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/supabase/require-user'
import { AppShell } from '@/components/layout/AppShell'
import { BackHeader } from '@/components/layout/BackHeader'

export default async function UploadPage() {
  const supabase = await createClient()
  await requireUser(supabase)

  return (
    <AppShell header={<BackHeader title="Novo material" backHref="/home" />}>
      <div
        className="flex gap-1.5 rounded-2xl"
        style={{ padding: 4, marginTop: 16, background: 'var(--surface-2)' }}
      >
        <div
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold"
          style={{ padding: 10, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
        >
          <Sparkles size={15} strokeWidth={2} />
          Gerar com IA
        </div>
        <div
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold"
          style={{ padding: 10, color: 'var(--muted)' }}
        >
          Importar CSV
        </div>
      </div>

      <div
        className="text-center rounded-[18px]"
        style={{ marginTop: 16, padding: '26px 18px', border: '1.7px dashed var(--border)', background: 'var(--surface)' }}
      >
        <div
          className="flex items-center justify-center rounded-2xl mx-auto"
          style={{ width: 48, height: 48, marginBottom: 12, background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
        >
          <UploadIcon size={24} strokeWidth={1.9} />
        </div>
        <div className="text-[14.5px] font-semibold">Toque para enviar arquivos</div>
        <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
          PDF, imagem, Word ou PowerPoint · até 20 MB
        </div>
      </div>

      <div className="text-[13px] font-bold" style={{ margin: '22px 0 10px' }}>Quantos flashcards gerar?</div>
      <div className="flex gap-[9px]">
        <div
          className="flex-1 text-left rounded-2xl"
          style={{ padding: 13, background: 'var(--accent-soft)', border: '1.5px solid var(--accent)' }}
        >
          <div className="text-[13.5px] font-bold">Automático</div>
          <div className="text-[11px] mt-0.5" style={{ opacity: 0.8 }}>A IA decide pelo volume</div>
        </div>
        <div
          className="flex-1 text-left rounded-2xl"
          style={{ padding: 13, background: 'var(--surface)', border: '1.5px solid var(--border)' }}
        >
          <div className="text-[13.5px] font-bold">Escolher</div>
          <div className="text-[11px] mt-0.5" style={{ opacity: 0.8 }}>Defino a quantidade</div>
        </div>
      </div>

      <div className="text-[13px] font-bold" style={{ margin: '22px 0 10px' }}>Onde salvar os cards?</div>
      <div className="flex flex-col gap-2">
        <div className="rounded-2xl" style={{ padding: '13px 14px', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
          <div className="flex items-center gap-[11px]">
            <span className="rounded-full flex-none" style={{ width: 18, height: 18, border: '2px solid var(--border)', background: 'var(--bg)' }} />
            <span className="text-[13.5px] font-semibold">Adicionar a uma coleção</span>
          </div>
        </div>
        <div className="rounded-2xl" style={{ padding: '13px 14px', background: 'var(--surface)', border: '1.5px solid var(--border)' }}>
          <div className="flex items-center gap-[11px]">
            <span className="rounded-full flex-none" style={{ width: 18, height: 18, border: '2px solid var(--border)', background: 'var(--bg)' }} />
            <span className="text-[13.5px] font-semibold">Criar nova coleção</span>
          </div>
        </div>
        <div className="rounded-2xl" style={{ padding: '13px 14px', background: 'var(--surface)', border: '1.5px solid var(--accent)' }}>
          <div className="flex items-center gap-[11px]">
            <span className="rounded-full flex-none" style={{ width: 18, height: 18, border: '5px solid var(--accent)', background: 'var(--bg)' }} />
            <span className="text-[13.5px] font-semibold">
              Deixar sem coleção <span style={{ color: 'var(--muted)', fontWeight: 500 }}>· decidir depois</span>
            </span>
          </div>
        </div>
      </div>

      <button
        disabled
        className="flex items-center justify-center gap-2 w-full rounded-2xl text-[15.5px] font-semibold"
        style={{
          marginTop: 24,
          padding: 15,
          color: 'var(--on-accent)',
          background: 'var(--accent)',
          opacity: 0.6,
          cursor: 'not-allowed',
        }}
      >
        <Sparkles size={18} strokeWidth={2} />
        Gerar flashcards
      </button>
      <div className="text-center text-xs mt-2.5" style={{ color: 'var(--muted)' }}>
        Geração via IA ainda não está disponível — em breve.
      </div>
    </AppShell>
  )
}
