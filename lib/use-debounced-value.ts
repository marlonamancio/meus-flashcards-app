'use client'

import { useEffect, useState } from 'react'

// Shared by the global search (/buscar, real network debounce) and the in-memory contextual
// search inside BrowseSession (light debounce, purely for visual smoothness — no network cost
// either way since that filter never leaves the client).
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}
