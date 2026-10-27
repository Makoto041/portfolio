// src/app/(frontend)/(site)/nope/NopeForm.tsx
// にせのログイン。押すたびに返事が変わるだけで、通信はしない（入力値は読みもしない）。
// <form> にしないのは、JavaScript が動く前・無効のときに、ブラウザの既定の送信（GET）で
// 入力内容が URL のクエリに載らないようにするため。
'use client'

import { useState, type KeyboardEvent } from 'react'

const REPLIES = [
  '惜しい。惜しくないけど。',
  'そのパスワード、世界でいちばん試されているやつです。',
  '押せば開くと思いました？ 開きません。',
  'このフォーム、そもそも何も送信していません。',
  'まだやるんですか。お茶でもどうぞ。（HTTP 418）',
  'ここまで来たあなたに、拍手。ホームへ帰りましょう。',
]

export default function NopeForm() {
  const [count, setCount] = useState(0)

  const reply = () => setCount((n) => n + 1)
  const replyOnEnter = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') reply()
  }

  return (
    <div role="group" aria-label="ログイン（にせもの）" className="s-nope-form">
      <label htmlFor="nope-id">
        メールアドレス
        <input
          id="nope-id"
          type="text"
          inputMode="email"
          autoComplete="off"
          placeholder="admin@example.com"
          onKeyDown={replyOnEnter}
        />
      </label>
      <label htmlFor="nope-pw">
        パスワード
        <input
          id="nope-pw"
          type="password"
          autoComplete="off"
          placeholder="password123"
          onKeyDown={replyOnEnter}
        />
      </label>
      <button type="button" className="s-pill is-solid" onClick={reply}>
        ログイン
      </button>
      <p className="s-formnote" role="status" aria-live="polite">
        {count === 0 ? '押してみてください。' : REPLIES[(count - 1) % REPLIES.length]}
      </p>
    </div>
  )
}
