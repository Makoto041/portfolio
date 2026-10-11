// src/components/soda/SodaTodayStamp.tsx
// 題字の横の「日付印」（事務の日付スタンプのような赤インクの丸）と、東京の時刻・天気の1行。
// 初回描画はサーバーが渡した時刻（today）で SSR と一致させ、マウント後にいまの時刻へ追従する
// （静的生成された古い HTML が配信されても、表示中に正しい日付・時刻へ直る）。
// 天気は自サイトの /api/weather プロキシ（open-meteo→met.no・東京固定）のみを使う。
'use client'

import { useEffect, useRef, useState } from 'react'
import WxIcon, { type WxKind } from '@/components/soda/WxIcon'
import { dayParts, fmtTime } from '@/lib/date'
import { timeoutSignal } from '@/lib/timeoutSignal'

type Weather = { temp: number; label: string; kind: WxKind; source?: string }

const WEEKDAY_EN: Record<string, string> = { 日: 'SUN', 月: 'MON', 火: 'TUE', 水: 'WED', 木: 'THU', 金: 'FRI', 土: 'SAT' }

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

export default function SodaTodayStamp({ today }: { today: string }) {
  // ── 時刻（Asia/Tokyo）。30秒ごとに分を追従 ──
  const [now, setNow] = useState(today)
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString())
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  // ── 天気（東京固定・取得は1回だけ。失敗時は時刻のみ） ──
  const [weather, setWeather] = useState<Weather | null>(null)
  const wxDone = useRef(false)
  useEffect(() => {
    if (wxDone.current) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/weather', { signal: timeoutSignal(10_000) })
        if (!res.ok) throw new Error(`Weather API failed: ${res.status}`)
        const data = (await res.json()) as { temp: number; code: number; source?: string }
        if (cancelled) return
        wxDone.current = true
        setWeather({ temp: data.temp, label: wxLabel(data.code), kind: wxKind(data.code), source: data.source })
      } catch {
        if (!cancelled) wxDone.current = true
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const d = dayParts(now)
  const date = d ? `${d.year}.${pad(d.month)}.${pad(d.day)}` : ''
  return (
    <div className="s-today">
      <div
        className="s-stamp"
        role="img"
        aria-label={d ? `きょうは${d.year}年${d.month}月${d.day}日（${d.weekday}）` : 'きょうの日付'}
      >
        <span className="s-stamp-t">TODAY</span>
        <span className="s-stamp-m">{date}</span>
        <span className="s-stamp-b">{d ? `${WEEKDAY_EN[d.weekday] ?? ''} · TOKYO` : 'TOKYO'}</span>
      </div>
      <p className="s-today-wx">
        <span className="s-num">{fmtTime(now)}</span>
        <span aria-hidden="true">·</span>
        <span className="s-wx-icon">
          <WxIcon kind={weather?.kind ?? 'sun'} />
        </span>
        <b className="s-num">{weather ? `${weather.temp}°C` : '--°'}</b>
        <span>{weather?.label ?? '東京'}</span>
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
      </p>
    </div>
  )
}
