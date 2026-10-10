// src/components/soda/SodaTabs.tsx
// 罫線タブの3段見出し（ラベル / タイトル / 補足）。写真に重ねて使うのが基本形。
// meta: タイトル段を本文サイズに落とした日付・属性用の2段タブ（見出しより目立たせない）。
import React from 'react'

type Props = {
  attr?: React.ReactNode
  title: React.ReactNode
  desc?: React.ReactNode
  /** 地色ではなく紙面色で塗る（紙面の上に置くとき） */
  paper?: boolean
  /** タイトル段を小さくする（日付などのメタ情報を載せるとき） */
  meta?: boolean
  /** タイトルの見出しレベル（カードは h3） */
  as?: 'h2' | 'h3' | 'p' | 'span'
}

export default function SodaTabs({ attr, title, desc, paper = false, meta = false, as: TitleTag = 'span' }: Props) {
  return (
    <div className={`s-tabs${paper ? ' is-paper' : ''}${meta ? ' is-meta' : ''}`}>
      {attr ? <span className="s-t-attr">{attr}</span> : null}
      <TitleTag className="s-t-title">{title}</TitleTag>
      {desc ? <span className="s-t-desc">{desc}</span> : null}
    </div>
  )
}
