// app/error.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertTriangle, Home } from 'lucide-react'

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex items-center justify-center bg-[url('/images/error-bg.svg')] bg-center bg-cover p-4"
    >
      <div className="glass p-8 max-w-lg w-full text-center space-y-6">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 animate-pulse" />
        <h1 className="text-4xl font-bold">申し訳ありません…</h1>
        <p className="text-gray-700">
          サーバーで問題が発生しました。<br/>
          ご不便をおかけして申し訳ありません。
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-[color:var(--accent)] text-white rounded-2xl hover:bg-[color:var(--accent)/.85] transition"
          >
            再試行する
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center gap-2 px-6 py-2 bg-white text-gray-800 rounded-2xl hover:bg-gray-100 transition"
          >
            <Home className="h-5 w-5" /> ホームへ戻る
          </button>
        </div>
      </div>
    </motion.div>
  )
}
