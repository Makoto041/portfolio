'use client'

// 写真ビューア。ネイティブ <dialog> + showModal() を採用し、
// Escape で閉じる・フォーカストラップ・閉時の呼び出し元へのフォーカス復帰を
// ブラウザ標準の挙動に委ねる（独自ポータル/z-index 管理はしない）。
// 複数枚のときは onPrev / onNext を渡すと、前後ボタン・←→キー・左右スワイプで移動できる。
// 写真・ボタン以外（暗幕の余白・上下の帯）をタップすると閉じる。スワイプ直後のクリックは閉じる操作にしない。
import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import Image from 'next/image'
import SodaIcon from '@/components/soda/SodaIcon'
import { toCFUrl, isOptimizableSrc } from '@/lib/cfUrl'

interface ImageModalProps {
  src: string
  alt?: string
  /** 呼び出し元グリッドが描画済みの画像URL（img.currentSrc）。
      キャッシュ命中で即時表示できるため、原本ロード中のポスターとして使う */
  posterSrc?: string | null
  isOpen: boolean
  onClose: () => void
  /** 前の写真へ（未指定なら前後移動の UI を出さない） */
  onPrev?: () => void
  /** 次の写真へ */
  onNext?: () => void
  /** 位置表示（例: "3 / 14"） */
  counter?: string
}

const SWIPE_PX = 40

/** 写真・ボタン・状態ピルの上か（それ以外は「余白」として閉じる対象） */
function onContent(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('img, button, .imgmodal-loading, .imgmodal-error'))
}

export default function ImageModal({
  src,
  alt = '',
  posterSrc,
  isOpen,
  onClose,
  onPrev,
  onNext,
  counter,
}: ImageModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // 1本指のスワイプだけを追う（2本目の指＝ピンチが加わったら取り消す）
  const swipe = useRef<{ id: number; x: number } | null>(null)
  // 余白で押したか（写真の上で押して余白で離したドラッグでは閉じない）
  const downOnBackdrop = useRef(false)
  // スワイプで移動した直後に来る click を閉じる操作として扱わない
  const swiped = useRef(false)
  const canStep = Boolean(onPrev && onNext)

  const handlePointerDown = (e: PointerEvent<HTMLDialogElement>) => {
    if (!e.isPrimary) {
      swipe.current = null
      return
    }
    swipe.current = { id: e.pointerId, x: e.clientX }
    downOnBackdrop.current = !onContent(e.target)
    swiped.current = false
  }

  const handlePointerUp = (e: PointerEvent<HTMLDialogElement>) => {
    const start = swipe.current
    swipe.current = null
    if (!start || start.id !== e.pointerId || !canStep) return
    const dx = e.clientX - start.x
    if (Math.abs(dx) > SWIPE_PX) {
      swiped.current = true
      ;(dx < 0 ? onNext : onPrev)?.()
    }
  }

  const handleClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (swiped.current) {
      swiped.current = false
      return
    }
    // キーボード操作の click（detail=0）は対象外。余白で押して余白で離したときだけ閉じる
    if (e.detail > 0 && downOnBackdrop.current && !onContent(e.target)) onClose()
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    else if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  // 開いている間は背景スクロールをロック
  useEffect(() => {
    if (!isOpen) return
    const root = document.documentElement
    const prev = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = prev
    }
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      className="imgmodal"
      aria-label="写真ビューア"
      // Escape・close() のどちらでも React 側の状態を同期する
      onClose={onClose}
      onKeyDown={(e) => {
        if (!canStep) return
        if (e.key === 'ArrowRight') onNext?.()
        if (e.key === 'ArrowLeft') onPrev?.()
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        swipe.current = null
      }}
      onClick={handleClick}
    >
      {isOpen && (
        <div className="imgmodal-frame">
          <div className="imgmodal-top">
            <span aria-live="polite">{counter}</span>
            <button type="button" className="imgmodal-close" aria-label="写真を閉じる" onClick={onClose}>
              <SodaIcon name="close" />
            </button>
          </div>
          <div className="imgmodal-body">
            {/* 読み込み状態は ModalBody 内に閉じる。key=src で写真ごとにマウントし直すため、
                必ず loading から始まり前の写真の loaded/error が漏れない */}
            {src && <ModalBody key={src} src={src} alt={alt} posterSrc={posterSrc} />}
          </div>
          <div className="imgmodal-nav">
            {canStep && (
              <>
                <button type="button" aria-label="前の写真" onClick={onPrev}>
                  <SodaIcon name="arrow-left" />
                </button>
                <button type="button" aria-label="次の写真" onClick={onNext}>
                  <SodaIcon name="arrow" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}

function ModalBody({ src, alt, posterSrc }: { src: string; alt: string; posterSrc?: string | null }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [posterFailed, setPosterFailed] = useState(false)
  // 原本と同一URLのポスターは意味がない（同じキャッシュから原本側に即描画される）。
  // ポスター自体の取得失敗時は通常表示（確保領域+ピル）へ戻す
  const poster = !posterFailed && posterSrc && posterSrc !== toCFUrl(src) ? posterSrc : null

  const statusPill =
    status === 'loading' ? (
      <span className="imgmodal-loading" role="status">
        <span className="imgmodal-spin" aria-hidden="true" />
        読み込み中…
      </span>
    ) : status === 'error' ? (
      <span className="imgmodal-error" role="alert">
        写真を読み込めませんでした
      </span>
    ) : null

  const original = (
    <Image
      src={toCFUrl(src)}
      alt={alt}
      width={1600}
      height={1200}
      sizes="100vw"
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

  if (poster) {
    // ポスター（描画済みキャッシュ画像）が段のサイズを決め、原本を上に重ねる。
    // ピルは段の中央にオーバーレイし、原本ロード完了で原本がフェードイン
    return (
      <span className="imgmodal-stage">
        <Image
          src={poster}
          alt=""
          aria-hidden="true"
          width={1600}
          height={1200}
          sizes="100vw"
          className="imgmodal-img imgmodal-poster"
          // currentSrc(最適化済みURL)を再最適化せず素通しし、キャッシュ命中を保つ
          unoptimized
          onError={() => setPosterFailed(true)}
        />
        {original}
        {statusPill}
      </span>
    )
  }

  return (
    <>
      {original}
      {statusPill}
    </>
  )
}
