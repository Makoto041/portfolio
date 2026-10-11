// src/components/quickpost/photo.ts
// 送る前にスマホで写真を縮小する（Vercel の送信上限 4.5MB に収め、通信量を減らす）。
// canvas に描き直すので、この時点で位置情報などの撮影データは落ちる（サーバーでも必ず作り直す）。
// 向きは <img> の EXIF 反映（image-orientation: from-image が既定）に任せる。
import { canSendPhotoAsIs, photoTypeOf } from '@/lib/quickpost/input'

/** 縮小の段階（長辺 px, JPEG 品質）。上限に収まるまで順に試す */
const STEPS: ReadonlyArray<readonly [number, number]> = [
  [2560, 0.86],
  [2048, 0.82],
  [1600, 0.78],
]

export class PhotoError extends Error {
  constructor(public code: 'unreadable' | 'too_large') {
    super(code)
    this.name = 'PhotoError'
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/** 上限（maxBytes）以下の JPEG にして返す。ブラウザで読めない形式でも、受け付ける形式で上限以下ならそのまま返す */
export async function prepareForUpload(file: File, maxBytes: number): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    try {
      await img.decode()
    } catch {
      // このブラウザで描けない形式（HEIC・AVIF など）。受け付ける形式で上限以下ならそのまま送り、
      // 読めるかはサーバーが中身で確かめる（読めなければ 415 で返り、画面に理由を出す）
      // 形式が空で渡された写真（HEIC など）は拡張子から形式を補い、その形式で送る
      const type = photoTypeOf(file.type, file.name)
      if (canSendPhotoAsIs(type, file.size, maxBytes)) {
        return file.type === type ? file : new Blob([file], { type })
      }
      throw new PhotoError('unreadable')
    }
    const w = img.naturalWidth
    const h = img.naturalHeight
    if (!w || !h) throw new PhotoError('unreadable')

    for (const [edge, quality] of STEPS) {
      const scale = Math.min(1, edge / Math.max(w, h))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(w * scale)
      canvas.height = Math.round(h * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new PhotoError('unreadable')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const blob = await toBlob(canvas, quality)
      // iOS は canvas のメモリを早めに手放さないと大きな写真で落ちるため、使い終えたら 0 にする
      canvas.width = 0
      canvas.height = 0
      if (blob && blob.size <= maxBytes) return blob
    }
    throw new PhotoError('too_large')
  } finally {
    URL.revokeObjectURL(url)
  }
}
