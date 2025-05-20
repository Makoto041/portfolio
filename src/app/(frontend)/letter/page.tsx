// src/app/(frontend)/letter/page.tsx
'use client'

import { useState } from 'react'
import Breadcrumb from '@/components/Breadcrumb'

const WRAP = 'mx-auto w-full max-w-[28rem] px-5 sm:px-8 section-pad flex justify-center'
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
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
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
    <main className="min-h-screen flex flex-col">
      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
      </div>
      <section className={WRAP}>
        <form onSubmit={handleSubmit} className={CARD}>
          <h1 className="text-2xl font-semibold mb-4">お便りを送る</h1>
          <input
            name="name"
            type="text"
            placeholder="お名前"
            required
            className="p-2 rounded border border-zinc-300"
          />
          <input
            name="email"
            type="email"
            placeholder="メールアドレス"
            required
            className="p-2 rounded border border-zinc-300"
          />
          <textarea
            name="message"
            placeholder="メッセージ"
            rows={5}
            required
            className="p-2 rounded border border-zinc-300"
          />
          <button
            type="submit"
            className="
              mt-4 py-2 rounded 
              bg-gray-200 text-gray-700 
              hover:bg-gray-300 
              transition 
              disabled:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
            "
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
