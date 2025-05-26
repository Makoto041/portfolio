'use client'

import { useState } from 'react'

type LikeButtonProps = {
  id: string | number
  initialLikes?: number
  onLikeUpdate?: (id: string | number, newLikes: number) => void
}

export default function LikeButton({ id, initialLikes = 0, onLikeUpdate }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes)
  const [isLoading, setIsLoading] = useState(false)

  async function handleLike() {
    if (isLoading) return
    
    try {
      setIsLoading(true)
      const res = await fetch(`/api/timelineGET/${id}/like`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to like')
      const data = await res.json()
      setLikes(data.likes)
      
      // 親コンポーネントに通知
      if (onLikeUpdate) {
        onLikeUpdate(id, data.likes)
      }
    } catch (e) {
      console.error('いいねエラー:', e)
      alert('いいねできませんでした')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex justify-end items-end w-full">
      <button
        className="flex items-center gap-1 text-pink-500 hover:scale-110 transition focus:outline-none"
        onClick={handleLike}
        type="button"
        disabled={isLoading}
      >
        <span className="inline-block w-5 h-5">
          {/* 綺麗なハートSVG */}
          <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.5" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </span>
        <span className="text-base font-semibold">{likes}</span>
      </button>
    </div>
  )
}
