// src/components/soda/RelDay.tsx
// 「きょう / きのう / ○日前」の小さなラベル。見る時刻で変わるため、静的生成された HTML には出さず
// マウント後にクライアントで計算して出す（初回描画は空＝SSR と一致し、ハイドレーション差分が出ない）。
'use client'

import { useEffect, useState } from 'react'
import { relativeDayLabel } from '@/lib/date'

export default function RelDay({ date, className = 's-rel' }: { date: string; className?: string }) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    setLabel(relativeDayLabel(date))
  }, [date])
  if (!label) return null
  return <span className={className}>{label}</span>
}
