// src/components/LocalTime.tsx
'use client' // ← ここから先は絶対にサーバーでは実行されない

import { useState, useEffect } from 'react'

/**
 * dateString を受け取って
 * └─ ブラウザのローカルタイムゾーンで時刻を表示するだけのコンポーネント
 */
export function LocalTime({ dateString }: { dateString: string }) {
  const [display, setDisplay] = useState('') // 最終的に描画する文字列を state 管理

  useEffect(() => {
    const dt = new Date(dateString)
    const formatted = new Intl.DateTimeFormat(
      undefined, // undefined = ブラウザの言語・タイムゾーン設定を使う
      { hour: '2-digit', minute: '2-digit', hour12: false },
    ).format(dt)
    setDisplay(formatted)
  }, [dateString])

  return <>{display}</> // state が更新されると、必ず再描画されてローカル時間に
}
