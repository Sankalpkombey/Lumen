import { useState, useCallback } from 'react'

export function usePanelState(key: string, defaultValue = true) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(key)
    if (saved !== null) {
      return saved === 'true'
    }
    return defaultValue
  })

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(key, String(next))
      return next
    })
  }, [key])

  const setExplicit = useCallback((value: boolean) => {
    setCollapsed(value)
    localStorage.setItem(key, String(value))
  }, [key])

  return [collapsed, toggle, setExplicit] as const
}
