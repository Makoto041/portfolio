'use client'

// 読み込み完了までコンテナ側のプレースホルダー（シマー/トーン）を見せ、
// 完了時にフェードインする next/image ラッパー。
import Image, { type ImageProps } from 'next/image'
import { useCallback, useState } from 'react'

export default function SmartImage({ className, ...props }: Omit<ImageProps, 'onLoad'>) {
  const [loaded, setLoaded] = useState(false)
  // SSR済み・キャッシュ済みでハイドレーション前に complete になった画像は
  // onLoad が発火しないため、ref 側で検出して透明のまま残らないようにする
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true)
  }, [])

  return (
    <Image
      {...props}
      ref={ref}
      onLoad={() => setLoaded(true)}
      className={`${className ?? ''} imgfade${loaded ? ' is-loaded' : ''}`.trim()}
    />
  )
}
