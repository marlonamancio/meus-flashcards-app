import { LogoMark } from '@/components/layout/LogoMark'

export function HeaderBrand() {
  return (
    <div className="flex items-center gap-[11px]">
      <LogoMark size={24} />
      <span className="text-[16px] font-bold" style={{ letterSpacing: '-0.01em' }}>
        Meus Flashcards
      </span>
    </div>
  )
}
