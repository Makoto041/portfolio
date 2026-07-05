// src/components/mist/MistHero.tsx
// ヒーロー: プロンプト + 大型ワードマーク（MAKOTO / IWABUCHI）+ タグライン。
// 初期ロードでワードマーク→タグラインをタイプライター表示する（docs/CHANGELOG.md §2）。
// タグライン本文・ロールは Payload（SiteSettings.hero）から編集可能。
// レイアウトシフト防止: 名前2行・タグライン行に min-height を与え、タイプ前の空状態でも高さを確保（CLS=0）。
'use client'

import { useEffect, useRef, useState } from 'react'

const MK = 'MAKOTO'
const IW = 'IWABUCHI'

// phase の進行: name-top → name-bot → tag → done
type Phase = 'name-top' | 'name-bot' | 'tag' | 'done'

type Props = {
  tagline: string
  role: string
}

export default function MistHero({ tagline, role }: Props) {
  const [nm, setNm] = useState('') // MAKOTO の表示分
  const [iw, setIw] = useState('') // IWABUCHI の表示分
  const [tag, setTag] = useState('') // タグライン本文の表示分
  const [phase, setPhase] = useState<Phase>('name-top')
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  // ── ワードマークのタイプ（マウント後 300ms で開始） ──
  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    if (reduce) {
      setNm(MK)
      setIw(IW)
      setTag(tagline)
      setPhase('done')
      return
    }

    const push = (fn: () => void, ms: number) => {
      timers.current.push(setTimeout(fn, ms))
    }

    const typeIwabuchi = () => {
      let j = 0
      const step = () => {
        j += 1
        setIw(IW.slice(0, j))
        if (j < IW.length) push(step, 90)
        else push(() => setPhase('tag'), 260) // 名前完了 → 少し置いてタグラインへ
      }
      step()
    }

    const typeMakoto = () => {
      let i = 0
      const step = () => {
        i += 1
        setNm(MK.slice(0, i))
        if (i < MK.length) push(step, 90)
        else {
          setPhase('name-bot') // カーソルを下段へ移動
          push(typeIwabuchi, 90)
        }
      }
      step()
    }

    push(typeMakoto, 300)

    return () => {
      timers.current.forEach(clearTimeout)
      timers.current = []
    }
  }, [tagline])

  // ── タグライン本文のタイプ（phase が tag になったら 70ms/字） ──
  useEffect(() => {
    if (phase !== 'tag') return
    let k = 0
    let id: ReturnType<typeof setTimeout>
    const step = () => {
      k += 1
      setTag(tagline.slice(0, k))
      if (k < tagline.length) id = setTimeout(step, 70)
      else setPhase('done')
    }
    id = setTimeout(step, 0)
    return () => clearTimeout(id)
  }, [phase, tagline])

  return (
    <>
      <span className="prompt">~/life $ whoami</span>
      <h1 className="nameblock">
        <span className="name-outline">
          {nm}
          {phase === 'name-top' && <span className="cursor" aria-hidden />}
        </span>
        <span className="name-fill">
          {iw}
          {/* MAKOTO 完了以降はブロックカーソルを下段行末に維持（リファレンス同様） */}
          {phase !== 'name-top' && <span className="cursor" aria-hidden />}
        </span>
        {/* SEO: 実名・かな表記はスクリーンリーダー/クローラー向けに保持 */}
        <span className="sr-only">岩渕誠（いわぶちまこと）のライフログ</span>
      </h1>
      <div className="tagline">
        <span className="jp">{tag}</span>
        {phase === 'tag' && <span className="jpcaret" aria-hidden />}
        <span className={`en${phase === 'done' ? ' show' : ''}`}>{role}</span>
      </div>
    </>
  )
}
