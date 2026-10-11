// src/components/soda/SodaPostLink.tsx
// 「投稿」ボタン。さっと投稿（/post）にログインした端末にだけ出す。
//   PC: ヘッダーの右（お便りの左）にピル / SP: 親指で届く画面右下（ドックの上）に丸いボタン
// 目印の Cookie（mk_post_ui=1・中身は 1 だけ）を見るだけで、認証はしない。
// ボタンが見えても、ログインが無ければ /post ではログイン画面になり、投稿はできない。
// /post は別のルートレイアウトなので、ふつうのリンク（ページ全体の読み込み）で開く。
'use client'

import { useEffect, useState } from 'react'
import SodaIcon from '@/components/soda/SodaIcon'

const HINT = 'mk_post_ui=1'

export default function SodaPostLink() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    setShow(document.cookie.split('; ').includes(HINT))
  }, [])
  if (!show) return null
  return (
    <>
      <a href="/post" className="s-pill s-postpill">
        <SodaIcon name="pencil" />
        投稿
      </a>
      <a href="/post" className="s-postfab" aria-label="投稿する">
        <SodaIcon name="pencil" />
      </a>
    </>
  )
}
