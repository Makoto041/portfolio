// src/app/(frontend)/(site)/nope/NopeForm.tsx
// にせのログインフォーム。押すたびに返事が変わるだけで、通信はしない（入力値は読みもしない）。
'use client'

import { useState, type FormEvent } from 'react'

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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCount((n) => n + 1)
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" noValidate className="s-nope-form">
      <label htmlFor="nope-id">
        メールアドレス
        <input id="nope-id" name="nope-id" type="text" inputMode="email" placeholder="admin@example.com" />
      </label>
      <label htmlFor="nope-pw">
        パスワード
        <input id="nope-pw" name="nope-pw" type="password" placeholder="password123" />
      </label>
      <button type="submit" className="s-pill is-solid">
        ログイン
      </button>
      <p className="s-formnote" role="status" aria-live="polite">
        {count === 0 ? '押してみてください。' : REPLIES[(count - 1) % REPLIES.length]}
      </p>
    </form>
  )
}
