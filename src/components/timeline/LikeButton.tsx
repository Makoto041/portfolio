'use client'

import { useEffect, useState } from 'react'

type LikeButtonProps = {
  id: string | number
  initialLikes?: number
  onLikeUpdate?: (id: string | number, newLikes: number) => void
}

const LIKED_STORAGE_KEY = 'tl_liked_posts'

function getLikedFromStorage(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LIKED_STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveLikedToStorage(id: string | number) {
  try {
    const liked = getLikedFromStorage()
    if (!liked.includes(String(id))) {
      liked.push(String(id))
      localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(liked.slice(-200)))
    }
  } catch {
    /* localStorage が使えない環境では UI 状態のみ */
  }
}

export default function LikeButton({ id, initialLikes = 0, onLikeUpdate }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  // ローカルのいいね済み状態を復元（サーバー側はCookieで重複防止）
  useEffect(() => {
    setLiked(getLikedFromStorage().includes(String(id)))
  }, [id])

  async function handleLike() {
    if (isLoading || liked) return

    // 控えめなアニメーション
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 450)

    // 楽観的更新
    const prevLikes = likes
    const newLikes = likes + 1
    setLikes(newLikes)
    setLiked(true)
    onLikeUpdate?.(id, newLikes)

    try {
      setIsLoading(true)
      const res = await fetch(`/api/timeline/${id}/like`, { method: 'POST' })
      if (!res.ok) throw new Error(`Failed to like: ${res.status}`)
      const data = await res.json()

      // サーバーからの正確な値で更新
      setLikes(data.likes)
      onLikeUpdate?.(id, data.likes)
      saveLikedToStorage(id)
    } catch (e) {
      console.error('いいねエラー:', e)
      // 失敗時はロールバック
      setLikes(prevLikes)
      setLiked(false)
      onLikeUpdate?.(id, prevLikes)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      className={`group flex items-center gap-1.5 transition-colors focus:outline-none ${
        liked ? 'cursor-default text-rose-400' : 'text-muted hover:text-rose-400'
      }`}
      onClick={handleLike}
      type="button"
      disabled={isLoading}
      aria-label={liked ? 'いいね済み' : 'いいねする'}
      aria-pressed={liked}
    >
      <span className="relative inline-block h-[18px] w-[18px]">
        <svg
          viewBox="0 0 24 24"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.8"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform duration-200 ${isAnimating ? 'scale-125' : 'group-hover:scale-110'}`}
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>

        {/* ワンショットの控えめなバースト */}
        {isAnimating && (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            className="absolute inset-0 h-[18px] w-[18px]"
            style={{ animation: 'likeBurst 0.45s ease-out forwards' }}
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        )}
      </span>
      <span className="text-[13px] font-medium tabular-nums">{likes}</span>

      <style jsx>{`
        @keyframes likeBurst {
          0% {
            transform: scale(1);
            opacity: 0.7;
          }
          100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </button>
  )
}
