// src/components/mist/MistStatusBar.tsx
// ステータス/ライブ環境の統合バー（docs/CHANGELOG.md §3・§4）:
//   左: ブライユスピナー + NOTICE（日付+メッセージを新しい順にローテーション、メッセージのみタイプ）
//   中: entries / photos / streak を常時並列表示（アニメなし・実データ）
//   右: 天気SVG + 気温 + ラベル·現在地 + 日付 + 時刻（HH:MM 秒なし・30s 更新）
// 天気は自サイトの /api/weather プロキシ（open-meteo→met.no）を流用。位置は ipinfo→東京フォールバック。
'use client'

import { useEffect, useRef, useState } from 'react'
import WxIcon, { type WxKind } from '@/components/mist/WxIcon'

export type NoticeItem = { badge: string; text: string }
type Weather = { temp: number; label: string; kind: WxKind; source?: string }

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const

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

type Props = {
  notices: NoticeItem[]
  entries: number
  photos: number
  streak: number
}

export default function MistStatusBar({ notices, entries, photos, streak }: Props) {
  const items = notices.length > 0 ? notices : [{ badge: '', text: '日々更新中' }]

  // ── NOTICE ローテーション ──
  const [spin, setSpin] = useState<string>(SPINNER[0])
  const [idx, setIdx] = useState(0)
  const [msg, setMsg] = useState('')
  const reduceRef = useRef(false)

  useEffect(() => {
    reduceRef.current =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    if (reduceRef.current) {
      setSpin('●')
      setMsg(items[0].text) // 先頭を固定表示
      return
    }

    // スピナー（90ms で回転）
    let si = 0
    const spinId = setInterval(() => {
      si = (si + 1) % SPINNER.length
      setSpin(SPINNER[si])
    }, 90)

    // メッセージ: タイプ → ホールド → 次へ（75ms ティック1本）
    let typed = 0
    let hold = 0
    let i = 0
    const rotId = setInterval(() => {
      const cur = items[i].text
      if (typed < cur.length) {
        typed += 1
        setMsg(cur.slice(0, typed))
        return
      }
      if (hold < 26) {
        hold += 1
        return
      }
      i = (i + 1) % items.length
      typed = 0
      hold = 0
      setMsg('')
      setIdx(i)
    }, 75)

    return () => {
      clearInterval(spinId)
      clearInterval(rotId)
    }
    // items は notices から導出。notices が変わったら組み直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notices])

  // ── 時計（HH:MM 秒なし・30s 更新） ──
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [])

  // ── 天気 + 現在地 ──
  const [place, setPlace] = useState('取得中…')
  const [weather, setWeather] = useState<Weather | null>(null)
  useEffect(() => {
    let cancelled = false

    const fetchWeather = async (lat?: number, lon?: number) => {
      const query = lat !== undefined && lon !== undefined ? `?lat=${lat}&lon=${lon}` : ''
      const res = await fetch(`/api/weather${query}`)
      if (!res.ok) throw new Error(`Weather API failed: ${res.status}`)
      const data = await res.json()
      if (cancelled) return
      setWeather({
        temp: data.temp,
        label: wxLabel(data.code),
        kind: wxKind(data.code),
        source: data.source,
      })
    }

    const fetchPlace = async (lat: number, lon: number) => {
      try {
        const res = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ja`,
        )
        if (!res.ok) throw new Error('reverse geocode failed')
        const d = await res.json()
        const p = d?.city || d?.locality || d?.principalSubdivision
        if (p && !cancelled) setPlace(p)
      } catch {
        if (!cancelled) setPlace('東京')
      }
    }

    const run = async () => {
      try {
        const res = await fetch('https://ipinfo.io/json')
        if (!res.ok) throw new Error('IP location failed')
        const data = await res.json()
        if (!data.loc) throw new Error('No location data')
        const [lat, lon] = data.loc.split(',').map(parseFloat)
        await Promise.all([fetchWeather(lat, lon), fetchPlace(lat, lon)])
      } catch {
        if (!cancelled) setPlace('東京')
        try {
          await fetchWeather()
        } catch {
          // 完全失敗時は時計のみ
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const badge = items[idx]?.badge ?? ''

  return (
    <div className="env">
      <span className="cmd">
        <span className="spin" aria-hidden>
          {spin}
        </span>
        <span className="rotwrap">
          NOTICE
          {badge && <span className="ndate">{badge}</span>}
          <span className="jp">{msg}</span>
          {!reduceRef.current && <span className="tcur" aria-hidden />}
        </span>
      </span>

      <span className="divider" aria-hidden />
      <span className="kv">
        entries: <b>{entries}</b>
      </span>
      <span className="kv">
        photos: <b>{photos}</b>
      </span>
      <span className="kv">
        streak: <b>{streak}d</b>
      </span>

      <span className="vals">
        <span className="icon">
          <WxIcon kind={weather?.kind ?? 'sun'} />
        </span>
        <span className="temp">{weather ? `${weather.temp}°C` : '--°'}</span>
        <span className="wx jp">
          {weather?.label ?? '—'} · {place}
        </span>
        {/* met.no 利用時はライセンス(NLOD/CC BY 4.0)に基づく帰属表示 */}
        {weather?.source === 'met.no' && (
          <a
            href="https://www.met.no/en"
            target="_blank"
            rel="noopener noreferrer"
            className="attribution"
            title="Weather data by MET Norway (NLOD / CC BY 4.0)"
          >
            MET Norway
          </a>
        )}
        <span className="sep" aria-hidden>
          |
        </span>
        {/* 日付＋時刻は1つの折返し単位（.dt）にまとめ、SPで時刻だけが単独でぶら下がるのを防ぐ */}
        <span className="dt">
          <span className="date" suppressHydrationWarning>
            {now
              ? `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${DAYS[now.getDay()]}`
              : ''}
          </span>
          <span className="time" suppressHydrationWarning>
            {now ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : '--:--'}
          </span>
        </span>
      </span>
    </div>
  )
}
