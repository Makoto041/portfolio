// src/app/(frontend)/(site)/letter/LetterForm.tsx
// お便りフォーム（POST /api/letter）。送信結果はフォーム下に文言で返す。
'use client'

import { useState, type FormEvent } from 'react'
import SodaIcon from '@/components/soda/SodaIcon'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

export default function LetterForm() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      message: (form.elements.namedItem('message') as HTMLTextAreaElement).value,
    }
    setStatus({ kind: 'sending' })
    try {
      const res = await fetch('/api/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(20_000),
      })
      if (res.status === 429) throw new Error('送信が続いています。少し時間をおいてからもう一度お試しください。')
      if (!res.ok) throw new Error('送信に失敗しました。時間をおいてもう一度お試しください。')
      setStatus({ kind: 'sent' })
      form.reset()
    } catch (err) {
      const message =
        err instanceof Error && err.name !== 'TimeoutError' && err.name !== 'AbortError'
          ? err.message
          : '送信に失敗しました。通信状況を確かめて、もう一度お試しください。'
      setStatus({ kind: 'error', message })
    }
  }

  const sending = status.kind === 'sending'

  return (
    <form onSubmit={handleSubmit} className="s-lform" onInput={() => status.kind === 'sent' && setStatus({ kind: 'idle' })}>
      <label htmlFor="letter-name">
        お名前
        <input
          id="letter-name"
          name="name"
          type="text"
          autoComplete="nickname"
          placeholder="ニックネームでも大丈夫です"
          maxLength={100}
          required
        />
      </label>
      <label htmlFor="letter-message">
        メッセージ
        <textarea id="letter-message" name="message" placeholder="ひとことでも、長文でも。" maxLength={5000} required />
      </label>
      <button type="submit" className="s-pill is-solid" disabled={sending}>
        {sending ? '送信中…' : 'お便りを送る！'}
      </button>
      <p className="s-hint">送った内容はいわぶち本人だけが読みます。返信が必要なら連絡先も書いてください。</p>
      <div aria-live="polite">
        {status.kind === 'sent' && (
          <p className="s-formnote">
            <SodaIcon name="mail" />
            届きました。ありがとうございます！
          </p>
        )}
        {status.kind === 'error' && (
          <p className="s-formnote" role="alert">
            {status.message}
          </p>
        )}
      </div>
    </form>
  )
}
