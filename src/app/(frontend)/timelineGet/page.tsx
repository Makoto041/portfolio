'use client' // このファイルはクライアント（ブラウザ）で動きます
import { LocalTime } from '@/components/LocalTime'
import React, { useState, useEffect } from 'react'
import WeatherWidget from '@/components/WeatherWidget'
import type { TimelineDoc } from '@/lib/payloadTypes'
import Breadcrumb from '@/components/Breadcrumb'
import { FaSpinner } from 'react-icons/fa'
import Link from 'next/link'

// ──────────── ヘルパー関数 ────────────
// ブラウザのタイムゾーンで「YYYY/MM/DD」の形式に整形します
function formatLocalDate(dateStr: string) {
  return new Intl.DateTimeFormat(
    undefined, // undefined = ユーザー設定のロケール
    { year: 'numeric', month: '2-digit', day: '2-digit' },
  ).format(new Date(dateStr))
}

// ブラウザのタイムゾーンで「HH:MM」の形式に整形します
function formatLocalTime(dateStr: string) {
  return new Intl.DateTimeFormat(
    undefined, // undefined = ユーザー設定のロケール
    { hour: '2-digit', minute: '2-digit', hour12: false },
  ).format(new Date(dateStr))
}

// ──────────── 定数定義 ────────────
// ページ全体のラッピング用クラス
const WRAP = 'mx-auto w-full max-w-[58rem] px-5 sm:px-8 section-pad'
// 各タイムラインアイテムのカードクラス
const CARD = 'glass p-4 rounded-lg mb-4'
// 日付セパレータの見出しクラス
const DATE_SEPARATOR = 'text-left text-base font-semibold py-2'

export default function TimelinePage() {
  // ─── React の状態管理 ───
  const [timeline, setTimeline] = useState<TimelineDoc[]>([]) // タイムラインのデータ配列
  const [page, setPage] = useState(1) // 何ページ目を取得中か
  const [hasMore, setHasMore] = useState(false) // 「もっと見る」を表示するか
  const [loading, setLoading] = useState(false) // データ取得中かどうか
  const limit = 10 // 1回に取ってくる件数

  // ─── データ取得用の副作用 ───
  useEffect(() => {
    setLoading(true) // ローディング開始
    fetch(`/api/timeline?page=${page}&limit=${limit}`) // API にリクエスト
      .then((res) => res.json()) // JSON に変換
      .then((newDocs: TimelineDoc[]) => {
        // 既存データと重複しないように追加
        setTimeline((prev) => {
          const seen = new Set(prev.map((d) => d.id))
          return [...prev, ...newDocs.filter((d) => !seen.has(d.id))]
        })
        // 取得件数が limit と同じなら、次ページがある可能性あり
        setHasMore(newDocs.length === limit)
      })
      .catch((err) => {
        console.error('タイムライン取得エラー:', err)
      })
      .finally(() => {
        setLoading(false) // ローディング終了
      })
  }, [page]) // page が変わるたびに再実行

  // ─── 日付ごとにグループ化 ───
  const groups = timeline.reduce<Record<string, TimelineDoc[]>>((acc, doc) => {
    // 日付キーはローカル日付で
    const dateKey = formatLocalDate(doc.publishedAt ?? doc.createdAt)
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(doc)
    return acc
  }, {})

  // ─── 日付キーを降順ソート ───
  const sortedDates = Object.keys(groups).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  )

  return (
    <main className="min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      {/* パンくずリスト */}
      <div className="mt-10 text-gray-400 text-left">
        <Breadcrumb />
      </div>

      {/* コンテンツエリア */}
      <section className={`${WRAP} py-12`}>
        {/* 見出し＋天気ウィジェット */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold">Timeline</h1>
          <WeatherWidget />
        </div>

        {/* 初回ロード中のスケルトン */}
        {loading && timeline.length === 0 && (
          <div>
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="glass p-4 rounded-lg mb-4 animate-pulse">
                <div className="h-3 w-20 bg-gray-200/30 rounded mb-2" />
                <div className="h-4 w-full bg-gray-200/20 rounded" />
                <div className="h-4 w-2/3 bg-gray-200/20 rounded mt-2" />
              </div>
            ))}
          </div>
        )}

        {/* 日付ごとに分割して表示 */}
        {sortedDates.map((date) => (
          <div key={date} className="mb-6">
            {/* 日付見出し */}
            <div className={DATE_SEPARATOR}>{date}</div>
            {/* その日のアイテム */}
            {groups[date].map((t) => (
              <div key={t.id} className={CARD}>
                {/* 時刻はローカル時刻で表示 */}
                <time className="block text-xs opacity-60 mb-2">
                  <LocalTime dateString={t.publishedAt ?? t.createdAt} />
                </time>
                {/* 本文テキスト */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{t.text}</p>
              </div>
            ))}
          </div>
        ))}

        {/* 「もっと見る」ボタン */}
        {hasMore && (
          <div className="flex justify-center mt-8">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="glass p-3 w-32 flex items-center justify-center rounded-lg hover:glass-hover transition"
              disabled={loading}
            >
              {/* ローディングインジケーター */}
              {loading && <FaSpinner className="animate-spin mr-2" />}
              もっと見る ▼
            </button>
          </div>
        )}

        {/* トップページへのリンク */}
        <div className="text-center mt-20">
          <Link href="/" className="text-sm underline">
            TOPページへ →
          </Link>
        </div>
      </section>
    </main>
  )
}
