import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { reencodePhoto, UnsupportedImageError } from '@/lib/quickpost/image'

const opts = { maxEdge: 2560, maxInputPixels: 64_000_000 }

/** 位置情報（GPS）と向き（横向きで撮った縦写真）を持つ JPEG */
async function photoWithGps(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: '#3b5a8c' } })
    .withMetadata({
      orientation: 6,
      exif: {
        IFD0: { Make: 'TestCam', Model: 'Phone 1' },
        IFD3: {
          GPSLatitudeRef: 'N',
          GPSLatitude: '35/1 41/1 22/1',
          GPSLongitudeRef: 'E',
          GPSLongitude: '139/1 41/1 30/1',
        },
      },
    })
    .jpeg()
    .toBuffer()
}

describe('reencodePhoto', () => {
  it('位置情報などの撮影データを残さず、向きを画素に反映した JPEG にする', async () => {
    const input = await photoWithGps(600, 400)
    expect((await sharp(input).metadata()).exif).toBeDefined()

    const out = await reencodePhoto(input, opts)
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('jpeg')
    expect(meta.exif).toBeUndefined()
    expect(meta.icc).toBeUndefined()
    expect(meta.orientation).toBeUndefined()
    // 横 600 × 縦 400 の画素に「90° 回転」の向き情報 → 縦長に反映される
    expect([meta.width, meta.height]).toEqual([400, 600])
  })

  it('長辺を上限まで縮める（拡大はしない）', async () => {
    const big = await sharp({
      create: { width: 4000, height: 3000, channels: 3, background: '#000' },
    })
      .png()
      .toBuffer()
    const meta = await sharp(await reencodePhoto(big, opts)).metadata()
    expect([meta.width, meta.height]).toEqual([2560, 1920])

    const small = await sharp({
      create: { width: 300, height: 200, channels: 3, background: '#fff' },
    })
      .webp()
      .toBuffer()
    const m2 = await sharp(await reencodePhoto(small, opts)).metadata()
    expect([m2.width, m2.height]).toEqual([300, 200])
  })

  it('画像でないもの・対象外の形式は断る', async () => {
    await expect(reencodePhoto(Buffer.from('<?php echo 1; ?>'), opts)).rejects.toThrow(
      UnsupportedImageError,
    )
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
    )
    await expect(reencodePhoto(svg, opts)).rejects.toThrow(UnsupportedImageError)
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } })
      .gif()
      .toBuffer()
    await expect(reencodePhoto(gif, opts)).rejects.toThrow(UnsupportedImageError)
  })

  it('透明な部分は黒ではなく白にする', async () => {
    const input = await sharp({
      create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toBuffer()
    const out = await reencodePhoto(input, opts)
    const { data } = await sharp(out).raw().toBuffer({ resolveWithObject: true })
    expect(Math.min(data[0], data[1], data[2])).toBeGreaterThan(240)
  })

  it('画素数が上限を超える画像は読み込まない', async () => {
    const input = await sharp({
      create: { width: 3000, height: 3000, channels: 3, background: '#000' },
    })
      .jpeg()
      .toBuffer()
    await expect(reencodePhoto(input, { ...opts, maxInputPixels: 1_000_000 })).rejects.toThrow(
      UnsupportedImageError,
    )
  })
})
