// src/components/soda/SodaLike.tsx
// いいねボタン（既存 POST /api/timeline/[id]/like を利用。localStorage キーも従来と共通）。
// 楽観的に +1 し、失敗したら元に戻す。重複はサーバーの httpOnly Cookie でも防いでいる。
'use client'

import { useEffect, useState } from 'react'
import SodaIcon from '@/components/soda/SodaIcon'

const LIKED_STORAGE_KEY = 'tl_liked_posts'

function readLiked(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LIKED_STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

export default function SodaLike({ id, initialLikes }: { id: string | number; initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pop, setPop] = useState(false)

  // ローカルのいいね済み状態を復元（SSR との不一致を避けるためマウント後に読む）
  useEffect(() => {
    setLiked(readLiked().includes(String(id)))
  }, [id])

  async function handleLike() {
    if (busy || liked) return
    const prev = likes
    setLikes(prev + 1)
    setLiked(true)
    setPop(true)
    try {
      setBusy(true)
      const res = await fetch(`/api/timeline/${id}/like`, { method: 'POST' })
      if (!res.ok) throw new Error(`Failed to like: ${res.status}`)
      const data = (await res.json()) as { likes?: number }
      if (typeof data.likes === 'number') setLikes(data.likes)
      try {
        const stored = readLiked()
        if (!stored.includes(String(id))) {
          stored.push(String(id))
          localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(stored.slice(-200)))
        }
      } catch {
        // localStorage が使えない環境では UI 状態のみ
      }
    } catch (e) {
      console.error('いいねエラー:', e)
      setLikes(prev)
      setLiked(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`s-like${liked ? ' is-on' : ''}${pop ? ' is-pop' : ''}`}
      onClick={handleLike}
      onAnimationEnd={() => setPop(false)}
      disabled={busy || liked}
      aria-pressed={liked}
      aria-label={liked ? `いいね済み（${likes}）` : `いいねする（${likes}）`}
    >
      <SodaIcon name="heart" />
      <span>{likes}</span>
    </button>
  )
}
