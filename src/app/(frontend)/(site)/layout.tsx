// app/(frontend)/(site)/layout.tsx
// サブページ共通の外枠。ホームと同じ SodaShell（ヘッダー・フッター・SP ドック・メニュー）で包む。
import React from 'react'
import SodaShell from '@/components/soda/SodaShell'
import { getSiteChrome } from '@/features/site/getSiteChrome'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const chrome = await getSiteChrome()
  return <SodaShell chrome={chrome}>{children}</SodaShell>
}
