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
  const [isAnimating, setIsAnimating] = useState(false)

  async function handleLike() {
    if (isLoading) return
    
    // アニメーションを開始
    setIsAnimating(true)
    setTimeout(() => setIsAnimating(false), 600)
    
    // 即座にUIを更新（楽観的更新）
    const newLikes = likes + 1
    setLikes(newLikes)
    if (onLikeUpdate) {
      onLikeUpdate(id, newLikes)
    }
    
    try {
      setIsLoading(true)
      const res = await fetch(`/api/timeline/${id}/like`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to like')
      const data = await res.json()
      
      // サーバーからの正確な値で更新
      setLikes(data.likes)
      if (onLikeUpdate) {
        onLikeUpdate(id, data.likes)
      }
    } catch (e) {
      console.error('いいねエラー:', e)
      // エラー時は元の値に戻す
      setLikes(likes)
      if (onLikeUpdate) {
        onLikeUpdate(id, likes)
      }
      alert('いいねできませんでした')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex justify-end items-end w-full">
      <button
        className="relative flex items-center gap-1 text-pink-500 hover:scale-110 transition focus:outline-none"
        onClick={handleLike}
        type="button"
        disabled={isLoading}
      >
        <span className="inline-block w-5 h-5 relative">
          {/* 綺麗なハートSVG */}
          <svg 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            stroke="currentColor" 
            strokeWidth="0.5" 
            xmlns="http://www.w3.org/2000/svg"
            className={`transition-all duration-200 ${isAnimating ? 'scale-125' : ''}`}
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
          
          {/* 飛び出すハートアニメーション */}
          {isAnimating && (
            <>
              <svg 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                xmlns="http://www.w3.org/2000/svg"
                className="absolute inset-0 w-8 h-8 -top-1 -left-1.5 animate-ping opacity-75"
                style={{ 
                  animation: 'heartBurst 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' 
                }}
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              
              {/* 小さなハートパーティクル */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(6)].map((_, i) => (
                  <svg
                    key={i}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="absolute w-3 h-3 opacity-80"
                    style={{
                      animation: `heartParticle${i + 1} 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                ))}
              </div>
            </>
          )}
        </span>
        <span className="text-base font-semibold">{likes}</span>
      </button>
      
      {/* カスタムCSS */}
      <style jsx>{`
        @keyframes heartBurst {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.8); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        
        @keyframes heartParticle1 {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          100% { transform: translate(-15px, -10px) scale(1); opacity: 0; }
        }
        
        @keyframes heartParticle2 {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          100% { transform: translate(15px, -10px) scale(1); opacity: 0; }
        }
        
        @keyframes heartParticle3 {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          100% { transform: translate(-10px, 15px) scale(1); opacity: 0; }
        }
        
        @keyframes heartParticle4 {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          100% { transform: translate(10px, 15px) scale(1); opacity: 0; }
        }
        
        @keyframes heartParticle5 {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          100% { transform: translate(-20px, 0px) scale(1); opacity: 0; }
        }
        
        @keyframes heartParticle6 {
          0% { transform: translate(0, 0) scale(0); opacity: 1; }
          100% { transform: translate(20px, 0px) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
