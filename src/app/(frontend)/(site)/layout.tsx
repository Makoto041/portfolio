// app/(frontend)/(site)/layout.tsx
// サブページ共通シェル。トップページ（Mist Terminal）と同じ意匠に統一するため、
// 全サブページを MistShell（ターミナルバー + ミスト背景 + $ exit 0 フッター）で包む。
import React from 'react'
import MistShell from '@/components/mist/MistShell'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <MistShell>{children}</MistShell>
}
