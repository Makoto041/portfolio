// src/components/gallery/usePhotoViewer.ts
// 写真ビューア（ImageModal）の開閉と前後移動の状態をまとめるフック。
// 一覧（ギャラリー・投稿の写真・記事内画像）側は open(index, poster) を呼ぶだけでよい。
'use client'

import { useCallback, useMemo, useState } from 'react'

export type ViewerItem = { src: string; alt?: string }

export function usePhotoViewer(items: ViewerItem[]) {
  const [state, setState] = useState<{ index: number; poster: string | null } | null>(null)
  const count = items.length

  const open = useCallback((index: number, poster: string | null = null) => {
    setState({ index, poster })
  }, [])
  const close = useCallback(() => setState(null), [])
  const step = useCallback(
    (delta: number) =>
      setState((s) => (s && count > 1 ? { index: (s.index + delta + count) % count, poster: null } : s)),
    [count],
  )

  const current = state ? items[state.index] : undefined
  const multi = count > 1

  const modalProps = useMemo(
    () => ({
      src: current?.src ?? '',
      alt: current?.alt ?? '',
      posterSrc: state?.poster ?? null,
      isOpen: Boolean(state && current),
      onClose: close,
      onPrev: multi ? () => step(-1) : undefined,
      onNext: multi ? () => step(1) : undefined,
      counter: multi && state ? `${state.index + 1} / ${count}` : undefined,
    }),
    [current, state, close, multi, step, count],
  )

  return { open, modalProps }
}
