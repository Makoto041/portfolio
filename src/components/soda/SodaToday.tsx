// src/components/soda/SodaToday.tsx
// TODAY カード: 日付・時刻（30秒ごと・秒なし）・東京の天気・おしらせ・数字（投稿/写真/連続）・お便りへの導線。
// PC はホーム右列（sticky）、SP は表紙の直下に圧縮表示（おしらせは最新1件）。
// 天気は自サイトの /api/weather プロキシ（open-meteo→met.no・東京固定）のみを使う。
'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import SodaIcon from '@/components/soda/SodaIcon'
import WxIcon, { type WxKind } from '@/components/soda/WxIcon'

export type NoticeView = {
  key: string
  /** `07.05` */
  badge: string
  text: string
  /** サーバーで分割済みの語の切れ目（<wbr> 用） */
  chunks: string[]
}

export type TodayStats = { entries: number; photos: number; streak: number }

type Weather = { temp: number; label: string; kind: WxKind; source?: string }

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const

function wxLabel(c: number): string {
  if (c === 0) return '快晴'
  if (c <= 2) return '晴れ'
  if (c === 3) return 'くもり'
  if (c <= 48) return '霧'
  if (c <= 57) return '霧雨'
  if (c <= 67) return '雨'
  if (c <= 77) return '雪'
  if (c <= 82) return 'にわか雨'
  if (c <= 86) return '雪'
  return '雷雨'
}

function wxKind(c: number): WxKind {
  if (c <= 1) return 'sun'
  if (c === 2) return 'partly'
  if (c === 3) return 'cloud'
  if (c <= 48) return 'fog'
  if (c <= 67) return 'rain'
  if (c <= 77) return 'snow'
  if (c <= 82) return 'rain'
  if (c <= 86) return 'snow'
  return 'thunder'
}

const pad = (v: number) => String(v).padStart(2, '0')

const FALLBACK_NOTICE: NoticeView = { key: 'fallback', badge: '', text: '日々更新中', chunks: ['日々更新中'] }

export default function SodaToday({ notices, stats }: { notices: NoticeView[]; stats: TodayStats }) {
  const list = notices.length > 0 ? notices : [FALLBACK_NOTICE]

  // ── 時計（SSR との不一致を避けるためマウント後に開始。30秒ごとに分を追従） ──
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  // ── 天気（東京固定・自サイトのプロキシのみ。失敗時は「--°」のまま） ──
  const [weather, setWeather] = useState<Weather | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/weather', { signal: AbortSignal.timeout(10_000) })
        if (!res.ok) throw new Error(`Weather API failed: ${res.status}`)
        const data = (await res.json()) as { temp: number; code: number; source?: string }
        if (cancelled) return
        setWeather({ temp: data.temp, label: wxLabel(data.code), kind: wxKind(data.code), source: data.source })
      } catch {
        // 失敗時は時計のみ表示（天気は「--°」）
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <aside className="s-today" aria-label="きょうのこと">
      <div className="s-clock">
        <div className="s-clock-date">
          <span className="s-d1" suppressHydrationWarning>
            {now ? `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日` : ' '}
          </span>
          <span className="s-d2" suppressHydrationWarning>
            {now ? `${WEEKDAYS[now.getDay()]}曜日` : ' '}
          </span>
        </div>
        <span className="s-tm" suppressHydrationWarning>
          {now ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : '--:--'}
        </span>
        <div className="s-wx">
          <span className="s-wx-row">
            <span className="s-wx-icon">
              <WxIcon kind={weather?.kind ?? 'sun'} />
            </span>
            <b>{weather ? `${weather.temp}°C` : '--°'}</b>
          </span>
          <span>{weather?.label ?? '—'} · 東京</span>
          {/* met.no 利用時はライセンス(NLOD/CC BY 4.0)に基づく帰属表示 */}
          {weather?.source === 'met.no' && (
            <a
              className="s-wx-credit"
              href="https://www.met.no/en"
              target="_blank"
              rel="noopener noreferrer"
              title="Weather data by MET Norway (NLOD / CC BY 4.0)"
            >
              MET Norway
            </a>
          )}
        </div>
      </div>
      <hr />
      <h3>おしらせ</h3>
      <ul className="s-notices">
        {list.map((n) => (
          <li key={n.key}>
            <span aria-hidden="true">☞</span>
            <span>
              {n.badge && <span className="s-nd">{n.badge}</span>}
              {n.chunks.map((c, i) => (
                <Fragment key={i}>
                  {i > 0 && <wbr />}
                  {c}
                </Fragment>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <hr />
      <div className="s-today-bottom">
        <div className="s-stats">
          <div>
            <b>{stats.entries}</b>
            <span>投稿</span>
          </div>
          <div>
            <b>{stats.photos}</b>
            <span>写真</span>
          </div>
          <div>
            <b>{stats.streak}日</b>
            <span>連続</span>
          </div>
        </div>
        <Link href="/letter" className="s-pill is-solid">
          <span className="s-long">お便りを送る！</span>
          <span className="s-short">お便り</span>
          <SodaIcon name="arrow" className="s-short" />
        </Link>
      </div>
    </aside>
  )
}
