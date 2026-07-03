// src/components/admin/AdminLinks.tsx
// 管理者ログイン時のみ表示される小さな導線。
// 表示可否は Payload の /api/users/me（httpOnly Cookie をサーバー側で検証）で判定し、
// 実際の書き込み権限は PayloadCMS の access control が強制する。
// （このリンクが見えても、未認証では投稿・編集は一切できない）
'use client'

import { useEffect, useState } from 'react'

export default function AdminLinks() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/users/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) setIsAdmin(true)
      })
      .catch(() => {
        /* 未ログイン時は何も表示しない */
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!isAdmin) return null

  return (
    <span className="inline-flex items-center gap-3 text-xs text-muted">
      {/* PayloadCMS Admin は別レイアウトのため、フルページ遷移させる */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/admin/collections/timeline/create"
        className="transition-opacity hover:opacity-70"
      >
        ＋ New Post
      </a>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/admin" className="transition-opacity hover:opacity-70">
        Admin
      </a>
    </span>
  )
}
