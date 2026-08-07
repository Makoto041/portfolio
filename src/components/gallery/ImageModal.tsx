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
  /** 呼び出し元グリッドが描画済みの画像URL（img.currentSrc）。
      キャッシュ命中で即時表示できるため、原本ロード中のポスターとして使う */
  posterSrc?: string | null
  isOpen: boolean
  onClose: () => void
}

export default function ImageModal({ src, alt = '', posterSrc, isOpen, onClose }: ImageModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

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
      {/* 読み込み状態は ModalBody 内に閉じる。開くたびにマウントし直される
          （閉時にアンマウント + key=src）ため、初回レンダーから必ず loading で
          始まり、前回の loaded/error が次の画像へ漏れない */}
      {isOpen && src && (
        <ModalBody key={src} src={src} alt={alt} posterSrc={posterSrc} onClose={onClose} />
      )}
    </dialog>
  )
}

function ModalBody({
  src,
  alt,
  posterSrc,
  onClose,
}: {
  src: string
  alt: string
  posterSrc?: string | null
  onClose: () => void
}) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [posterFailed, setPosterFailed] = useState(false)
  // 原本と同一URLのポスターは意味がない（同じキャッシュから原本側に即描画される）。
  // ポスター自体の取得失敗時は通常表示（is-loading の確保領域+ピル）へ戻す
  const poster = !posterFailed && posterSrc && posterSrc !== toCFUrl(src) ? posterSrc : null

  const statusPill =
    status === 'loading' ? (
      <span className="imgmodal-loading" role="status">
        <span className="spin" aria-hidden="true" />
        読み込み中…
      </span>
    ) : status === 'error' ? (
      <span className="imgmodal-error" role="alert">
        画像を読み込めませんでした
      </span>
    ) : null

  const original = (
    <Image
      src={toCFUrl(src)}
      alt={alt}
      width={1200}
      height={900}
      sizes="92vw"
      className={`imgmodal-img${poster ? ' imgmodal-full' : ''}${status === 'loaded' ? ' is-loaded' : ''}`}
      onLoad={() => setStatus('loaded')}
      onError={() => {
        console.error('ImageModal: 画像の読み込みに失敗しました', src)
        setStatus('error')
      }}
      // リッチテキスト経由で外部ホストの画像も開くため、CF/相対以外は最適化を通さない
      unoptimized={!isOptimizableSrc(toCFUrl(src))}
    />
  )

  return (
    <div className={`imgmodal-body${!poster && status !== 'loaded' ? ' is-loading' : ''}`}>
      {poster ? (
        // ポスター（描画済みキャッシュ画像）が段のサイズを決め、原本を上に重ねる。
        // ピルは段の中央にオーバーレイし、原本ロード完了で原本がフェードイン
        <span className="imgmodal-stage">
          <Image
            src={poster}
            alt=""
            aria-hidden="true"
            width={1200}
            height={900}
            sizes="92vw"
            className="imgmodal-img imgmodal-poster"
            // currentSrc(最適化済みURL)を再最適化せず素通しし、キャッシュ命中を保つ
            unoptimized
            onError={() => setPosterFailed(true)}
          />
          {original}
          {statusPill}
        </span>
      ) : (
        <>
          {original}
          {statusPill}
        </>
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
  )
}
