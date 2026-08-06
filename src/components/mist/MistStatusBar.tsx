// src/components/mist/MistStatusBar.tsx
// ステータス/ライブ環境の統合バー（docs/CHANGELOG.md §3・§4）:
//   左: ブライユスピナー（CSSアニメ） + NOTICE（日付+メッセージを新しい順にローテーション、メッセージのみタイプ）
//   中: entries / photos / streak を常時並列表示（アニメなし・実データ）
//   右: 天気SVG + 気温 + ラベル + 日付 + 時刻（HH:MM 秒なし・30s 更新）
// 天気は自サイトの /api/weather プロキシ（open-meteo→met.no・東京固定）。
// 外部への位置情報系リクエスト（ipinfo / reverse geocode）は行わない。
'use client'

import { useEffect, useRef, useState } from 'react'
import WxIcon, { type WxKind } from '@/components/mist/WxIcon'

export type NoticeItem = { badge: string; text: string }
type Weather = { temp: number; label: string; kind: WxKind; source?: string }

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

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
  // スピナーは CSS アニメーション（.spin::before の content フレーム）に移譲し、
  // React の高頻度 setState を廃止。ここではメッセージのタイプのみ扱う。
  const [idx, setIdx] = useState(0)
  const [msg, setMsg] = useState('')
  const [reduce, setReduce] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (reduceMotion) {
      setReduce(true)
      setIdx(0)
      setMsg(items[0].text) // 先頭を固定表示
      return
    }

    // メッセージ: タイプ → ホールド → 次へ（75ms の setTimeout チェーン1本）。
    // タブ非表示・バーが画面外の間はチェーン自体を停止し、可視化イベントで再開する。
    let typed = 0
    let hold = 0
    let i = 0
    let hidden = document.hidden
    let offscreen = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const step = () => {
      timer = undefined
      if (hidden || offscreen) return // 停止（再開は可視化イベント側から）
      const cur = items[i].text
      if (typed < cur.length) {
        typed += 1
        setMsg(cur.slice(0, typed))
      } else if (hold < 26) {
        hold += 1
      } else {
        i = (i + 1) % items.length
        typed = 0
        hold = 0
        setMsg('')
        setIdx(i)
      }
      schedule()
    }
    const schedule = () => {
      if (timer === undefined) timer = setTimeout(step, 75)
    }
    schedule()

    const resumeIfVisible = () => {
      if (!hidden && !offscreen) schedule()
    }
    const onVisibility = () => {
      hidden = document.hidden
      resumeIfVisible()
    }
    document.addEventListener('visibilitychange', onVisibility)

    let io: IntersectionObserver | undefined
    if (typeof IntersectionObserver !== 'undefined' && rootRef.current) {
      io = new IntersectionObserver(([entry]) => {
        offscreen = !entry.isIntersecting
        resumeIfVisible()
      })
      io.observe(rootRef.current)
    }

    return () => {
      if (timer !== undefined) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      io?.disconnect()
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

  // ── 天気（東京固定・自サイトのプロキシ API のみ） ──
  // 訪問者の IP から位置を推定する外部リクエストは、プライバシー・外部依存・
  // モバイルの通信量の観点で廃止（Codex レビュー反映）。
  const [weather, setWeather] = useState<Weather | null>(null)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/weather')
        if (!res.ok) throw new Error(`Weather API failed: ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        setWeather({
          temp: data.temp,
          label: wxLabel(data.code),
          kind: wxKind(data.code),
          source: data.source,
        })
      } catch {
        // 失敗時は時計のみ（「--°」表示を維持）
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const badge = items[idx]?.badge ?? ''

  return (
    <div className="env" ref={rootRef}>
      <span className="cmd">
        <span className="spin" aria-hidden />
        <span className="rotwrap">
          NOTICE
          {badge && <span className="ndate">{badge}</span>}
          <span className="jp">{msg}</span>
          {!reduce && <span className="tcur" aria-hidden />}
        </span>
      </span>

      <span className="divider" aria-hidden />
      {/* stats: PC は display:contents で従来の横並び、SP は .stats で独立行にまとめる */}
      <span className="stats">
        <span className="kv">
          entries: <b>{entries}</b>
        </span>
        <span className="kv">
          photos: <b>{photos}</b>
        </span>
        <span className="kv">
          streak: <b>{streak}d</b>
        </span>
      </span>

      <span className="vals">
        <span className="icon">
          <WxIcon kind={weather?.kind ?? 'sun'} />
        </span>
        <span className="temp">{weather ? `${weather.temp}°C` : '--°'}</span>
        <span className="wx jp">{weather?.label ?? '—'} · 東京</span>
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
            {now ? (
              <>
                <span className="yr">{now.getFullYear()}.</span>
                {pad(now.getMonth() + 1)}.{pad(now.getDate())}
                <span className="wd"> {DAYS[now.getDay()]}</span>
              </>
            ) : (
              ''
            )}
          </span>
          <span className="time" suppressHydrationWarning>
            {now ? `${pad(now.getHours())}:${pad(now.getMinutes())}` : '--:--'}
          </span>
        </span>
      </span>
    </div>
  )
}
