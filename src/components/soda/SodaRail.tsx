// src/components/soda/SodaRail.tsx
// SP では横スワイプのレール（「1 / 4」と前後ボタン付き）、PC ではグリッドになる入れ物。
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import SodaIcon from '@/components/soda/SodaIcon'

type Props = { children: ReactNode; count: number; four?: boolean }

export default function SodaRail({ children, count, four = false }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(1)

  useEffect(() => {
    const rail = ref.current
    if (!rail) return
    const onScroll = () => {
      const first = rail.firstElementChild as HTMLElement | null
      const step = (first?.getBoundingClientRect().width ?? rail.clientWidth) + 12
      setIndex(Math.min(count, Math.round(rail.scrollLeft / step) + 1))
    }
    rail.addEventListener('scroll', onScroll, { passive: true })
    return () => rail.removeEventListener('scroll', onScroll)
  }, [count])

  const scrollByCard = (dir: 1 | -1) => {
    const rail = ref.current
    if (!rail) return
    const first = rail.firstElementChild as HTMLElement | null
    const step = (first?.getBoundingClientRect().width ?? rail.clientWidth) + 12
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    rail.scrollBy({ left: dir * step, behavior: reduce ? 'auto' : 'smooth' })
  }

  return (
    <>
      <div ref={ref} className={`s-rail${four ? ' is-four' : ''}`}>
        {children}
      </div>
      {count > 1 && (
        <div className="s-railnav">
          <button
            type="button"
            className="is-prev"
            aria-label="前へ"
            disabled={index <= 1}
            onClick={() => scrollByCard(-1)}
          >
            <SodaIcon name="arrow-left" />
          </button>
          <span className="s-num" aria-live="polite">
            {index} / {count}
          </span>
          <button type="button" aria-label="次へ" disabled={index >= count} onClick={() => scrollByCard(1)}>
            <SodaIcon name="arrow" />
          </button>
        </div>
      )}
    </>
  )
}
