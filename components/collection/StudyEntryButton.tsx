'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Play } from 'lucide-react'
import { resetStudyProgressAction } from '@/app/(app)/collection/[id]/estudar/actions'
import { Modal } from '@/components/ui/Modal'
import { Alert } from '@/components/ui/Alert'

const buttonStyle = {
  marginTop: 16,
  padding: 15,
  color: 'var(--on-accent)',
  background: 'var(--accent)',
  boxShadow: '0 8px 20px var(--accent-soft)',
}

export function StudyEntryButton({ collectionId, hasProgress }: { collectionId: string; hasProgress: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const studyHref = `/collection/${collectionId}/estudar`

  async function handleStartFresh() {
    setResetting(true)
    setError(null)

    const result = await resetStudyProgressAction(collectionId)

    if (!result.ok) {
      setError(result.error)
      setResetting(false)
      return
    }

    router.push(studyHref)
  }

  function handleClose() {
    if (resetting) return
    setOpen(false)
    setError(null)
  }

  if (!hasProgress) {
    return (
      <Link href={studyHref} className="flex items-center justify-center gap-2 w-full rounded-2xl text-[15px] font-semibold" style={buttonStyle}>
        <Play size={18} fill="var(--on-accent)" strokeWidth={0} />
        Estudar esta coleção
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 w-full rounded-2xl text-[15px] font-semibold"
        style={buttonStyle}
      >
        <Play size={18} fill="var(--on-accent)" strokeWidth={0} />
        Estudar esta coleção
      </button>

      <Modal open={open} onClose={handleClose}>
        <div className="text-[15px] font-bold mb-2">Continuar de onde parou?</div>
        <p className="text-[13px]" style={{ color: 'var(--muted)', lineHeight: 1.5 }}>
          Você tem uma sessão em andamento nesta coleção. Quer continuar de onde parou ou começar do zero?
        </p>
        {error && <Alert style={{ marginTop: 10 }}>{error}</Alert>}
        <div className="flex flex-col gap-2 mt-4">
          <Link
            href={studyHref}
            className="text-center rounded-xl text-[13.5px] font-semibold"
            style={{ padding: 12, background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            Continuar de onde parei
          </Link>
          <button
            type="button"
            onClick={handleStartFresh}
            disabled={resetting}
            className="rounded-xl text-[13.5px] font-semibold disabled:opacity-60"
            style={{ padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            {resetting ? 'Preparando...' : 'Começar do zero'}
          </button>
        </div>
      </Modal>
    </>
  )
}
