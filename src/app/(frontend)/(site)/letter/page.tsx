// src/app/(frontend)/letter/page.tsx
'use client'

import { useState } from 'react'
import MistPageHead from '@/components/mist/MistPageHead'

export default function LetterPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,

      message: (form.elements.namedItem('message') as HTMLTextAreaElement).value,
    }
    try {
      const res = await fetch('/api/letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('送信に失敗しました')
      setSent(true)
      form.reset()
    } catch (err: any) {
      setError(err.message || '送信に失敗しました')
    } finally {
      setLoading(false)
      setTimeout(() => setSent(false), 2000)
    }
  }

  return (
    <main className="content">
      <MistPageHead cmd="vim ./letter" title="Letter" desc="お便り・メッセージはこちらから" />
      <section className="single">
        <div className="card" style={{ padding: '26px 26px' }}>
          <span className="cmd">$ echo &quot;...&quot; &gt;&gt; letter</span>
          <form onSubmit={handleSubmit} className="mform">
            <label>
              お名前
              <input name="name" type="text" placeholder="name" maxLength={100} required />
            </label>
            <label>
              メッセージ
              <textarea name="message" placeholder="message" rows={5} maxLength={5000} required />
            </label>
            <button type="submit" className="submit" disabled={loading}>
              {loading ? '$ sending...' : '$ send --letter'}
            </button>
            {sent && (
              <p className="formnote" style={{ color: 'oklch(0.6 0.14 155)' }}>
                ✓ 送信しました！
              </p>
            )}
            {error && (
              <p className="formnote" style={{ color: 'oklch(0.6 0.18 25)' }}>
                ✗ {error}
              </p>
            )}
          </form>
        </div>
      </section>
    </main>
  )
}
