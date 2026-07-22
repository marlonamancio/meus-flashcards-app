'use client'

import { useEffect, useState } from 'react'

type Font = 'sans' | 'serif'

export function useFont() {
  const [font, setFont] = useState<Font>('sans')

  useEffect(() => {
    const stored = localStorage.getItem('font') as Font | null
    const current = document.documentElement.getAttribute('data-font') as Font
    setFont(stored || current || 'sans')
  }, [])

  function toggleFont() {
    const next: Font = font === 'sans' ? 'serif' : 'sans'
    setFont(next)
    document.documentElement.setAttribute('data-font', next)
    localStorage.setItem('font', next)
  }

  return { font, toggleFont }
}
