// src/lib/quickpost/image.ts
// さっと投稿の写真をサーバーで作り直す。
// - 中身で画像の形式を見分け、JPEG / PNG / WebP / HEIF / AVIF 以外は断る（拡張子や Content-Type は信用しない）
// - 向き（EXIF）を画素に反映してから、位置情報（GPS）を含む撮影データをすべて落として JPEG に書き出す
//   （sharp は withMetadata を呼ばない限りメタデータを残さず、色は sRGB に揃える）
// - 長辺を上限に縮め、巨大な画素数の画像は読み込まない
import sharp from 'sharp'

const FORMATS = new Set(['jpeg', 'png', 'webp', 'heif', 'avif'])

export class UnsupportedImageError extends Error {
  constructor() {
    super('unsupported image')
    this.name = 'UnsupportedImageError'
  }
}

export async function reencodePhoto(
  input: Buffer,
  { maxEdge, maxInputPixels }: { maxEdge: number; maxInputPixels: number },
): Promise<Buffer> {
  let format: string | undefined
  try {
    format = (await sharp(input, { limitInputPixels: maxInputPixels }).metadata()).format
  } catch {
    throw new UnsupportedImageError()
  }
  if (!format || !FORMATS.has(format)) throw new UnsupportedImageError()
  try {
    return await sharp(input, { limitInputPixels: maxInputPixels })
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer()
  } catch {
    throw new UnsupportedImageError()
  }
}
