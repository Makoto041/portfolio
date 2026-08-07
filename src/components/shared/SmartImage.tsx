'use client'

// 読み込み完了までコンテナ側のプレースホルダー（シマー/トーン）を見せ、
// 完了時にフェードインする next/image ラッパー。
import Image, { type ImageProps } from 'next/image'
import { useCallback, useState } from 'react'

export default function SmartImage({ className, ...props }: Omit<ImageProps, 'onLoad' | 'onError'>) {
  // 成功/失敗を問わず「確定」でフェード表示に切り替える。失敗を loading のまま
  // 残すと、壊れた画像が透明のままシマーが無限に続いてしまう
  const [settled, setSettled] = useState(false)
  // SSR済み・キャッシュ済みでハイドレーション前に complete になった画像は
  // onLoad/onError が発火しないため、ref 側で検出して透明のまま残らないようにする
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img && img.complete) setSettled(true)
  }, [])

  return (
    <Image
      {...props}
      ref={ref}
      onLoad={() => setSettled(true)}
      onError={() => {
        console.error(
          'SmartImage: 画像の読み込みに失敗しました',
          typeof props.src === 'string' ? props.src : '',
        )
        setSettled(true)
      }}
      className={`${className ?? ''} imgfade${settled ? ' is-loaded' : ''}`.trim()}
    />
  )
}
