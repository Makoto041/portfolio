// src/components/admin/AdminLinks.tsx
// 管理者ログイン時のみ表示される小さな導線。
// 表示可否は Payload の /api/users/me（httpOnly Cookie をサーバー側で検証）で判定し、
// 実際の書き込み権限は PayloadCMS の access control が強制する。
// （このリンクが見えても、未認証では投稿・編集は一切できない）
'use client'

import { useEffect, useState } from 'react'
import SodaIcon from '@/components/soda/SodaIcon'

export default function AdminLinks() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/users/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) setIsAdmin(true)
      })
      .catch((error) => {
        // 未ログイン時は何も表示しないが、予期しない失敗は追跡できるようログに残す
        console.error('Failed to fetch current user:', error)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!isAdmin) return null

  return (
    <span className="s-admin">
      {/* PayloadCMS Admin は別レイアウトのため、フルページ遷移させる */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/admin/collections/timeline/create" className="s-pill is-solid">
        <SodaIcon name="pencil" />
        新しく投稿
      </a>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/admin" className="s-pill">
        管理画面
      </a>
    </span>
  )
}
