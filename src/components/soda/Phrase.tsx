// src/components/soda/Phrase.tsx
// 大きな日本語見出しを語の切れ目でだけ改行させる（CSS 側は word-break: keep-all）。
// 分割結果が実行環境の ICU に依存するため、サーバーコンポーネントでのみ使う
// （クライアントで再計算するとハイドレーション差分になり得る）。
import { Fragment } from 'react'
import { phraseChunks } from '@/lib/phrase'

export default function Phrase({ text }: { text: string }) {
  const chunks = phraseChunks(text)
  return (
    <>
      {chunks.map((chunk, i) => (
        <Fragment key={i}>
          {i > 0 && <wbr />}
          {chunk}
        </Fragment>
      ))}
    </>
  )
}
