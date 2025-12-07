// src/components/LocalDate.tsx
'use client'

type Props = { dateStr: string; formatType?: 'auto' | 'full' | 'dateOnly' }
export default function LocalDate({ dateStr, formatType = 'auto' }: Props) {
  // 受け取った値をDateとして解釈
  const utcDate = new Date(dateStr)
  // JSTでの年月日時分を取得
  const jstDate = new Date(utcDate.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  const year = jstDate.getFullYear()
  const month = jstDate.getMonth() + 1
  const day = jstDate.getDate()
  const hour = jstDate.getHours().toString().padStart(2, '0')
  const minute = jstDate.getMinutes().toString().padStart(2, '0')
  const now = new Date()
  const thisYear = now.getFullYear()
  let formatted = ''
  if (formatType === 'dateOnly') {
    // 日付のみ表示（時刻なし）
    formatted = year !== thisYear
      ? `${year}年${month}月${day}日`
      : `${month}月${day}日`
  } else if (formatType === 'full' || year !== thisYear) {
    formatted = `${year}年${month}月${day}日 ${hour}:${minute}`
  } else {
    formatted = `${month}月${day}日 ${hour}:${minute}`
  }
  return (
    <span>{formatted}</span>
  )
}
