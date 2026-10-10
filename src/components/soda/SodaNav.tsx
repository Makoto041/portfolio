// src/components/soda/SodaNav.tsx
// ヘッダー・SP ドック・メニュー（ドロワー）で共有する開閉状態。
'use client'

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type NavState = { isOpen: boolean; open: () => void; close: () => void }

const NavContext = createContext<NavState | null>(null)

export function SodaNavProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const open = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])
  const value = useMemo(() => ({ isOpen, open, close }), [isOpen, open, close])
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useSodaNav(): NavState {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useSodaNav must be used within <SodaNavProvider>')
  return ctx
}
