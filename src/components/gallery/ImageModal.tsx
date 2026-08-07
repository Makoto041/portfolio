'use client'

// 画像プレビューモーダル。ネイティブ <dialog> + showModal() を採用し、
// Escape で閉じる・フォーカストラップ・閉時の呼び出し元へのフォーカス復帰を
// ブラウザ標準の挙動に委ねる（独自ポータル/z-index 管理は廃止）。
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { toCFUrl, isOptimizableSrc } from '@/lib/cfUrl'

interface ImageModalProps {
  src: string
  alt?: string
  isOpen: boolean
  onClose: () => void
}

export default function ImageModal({ src, alt = '', isOpen, onClose }: ImageModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  // 開くたび・画像が変わるたびに読み込み状態へ戻す
  useEffect(() => {
    if (isOpen) setStatus('loading')
  }, [isOpen, src])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    else if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  // 開いている間は背景スクロールをロック
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      className="imgmodal"
      aria-label="画像プレビュー"
      // Escape・close() のどちらでも React 側の状態を同期する
      onClose={onClose}
      // ダイアログ要素自身（=背景 ::backdrop 相当領域）のクリックで閉じる
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {isOpen && src && (
        <div className={`imgmodal-body${status !== 'loaded' ? ' is-loading' : ''}`}>
          <Image
            src={toCFUrl(src)}
            alt={alt}
            width={1200}
            height={900}
            sizes="92vw"
            className={`imgmodal-img${status === 'loaded' ? ' is-loaded' : ''}`}
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
            // リッチテキスト経由で外部ホストの画像も開くため、CF/相対以外は最適化を通さない
            unoptimized={!isOptimizableSrc(toCFUrl(src))}
          />
          {status === 'loading' && (
            <span className="imgmodal-loading" role="status">
              <span className="spin" aria-hidden="true" />
              読み込み中…
            </span>
          )}
          {status === 'error' && (
            <span className="imgmodal-loading" role="alert">
              画像を読み込めませんでした
            </span>
          )}
          <button
            type="button"
            className="imgmodal-close"
            aria-label="プレビューを閉じる"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      )}
    </dialog>
  )
}
