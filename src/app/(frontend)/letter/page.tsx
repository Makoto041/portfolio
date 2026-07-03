// src/app/(frontend)/letter/page.tsx
'use client'

import { useState } from 'react'
import PageHeader from '@/components/layout/PageHeader'

const WRAP = 'mx-auto w-full max-w-[28rem] flex justify-center'
const CARD = 'glass p-8 flex flex-col gap-4 w-full'

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
    <main className="pb-16">
      <PageHeader title="Letter" description="お便り・メッセージはこちらから" />
      <section className={WRAP}>
        <form onSubmit={handleSubmit} className={CARD}>
          <h2 className="text-lg font-semibold">お便りを送る</h2>
          <input
            name="name"
            type="text"
            placeholder="お名前"
            required
            className="rounded-xl border border-[color:var(--card-border)] bg-white/50 p-2.5 text-sm transition-colors focus:border-[color:var(--accent)] focus:outline-none dark:bg-white/5"
          />
          <textarea
            name="message"
            placeholder="メッセージ"
            rows={5}
            required
            className="rounded-xl border border-[color:var(--card-border)] bg-white/50 p-2.5 text-sm transition-colors focus:border-[color:var(--accent)] focus:outline-none dark:bg-white/5"
          />
          <button
            type="submit"
            className="pill mt-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '送信中...' : '送信'}
          </button>
          {sent && <p className="mt-2 text-sm text-green-500">送信しました！</p>}
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        </form>
      </section>
    </main>
  )
}
