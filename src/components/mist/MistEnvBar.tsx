// src/components/mist/MistEnvBar.tsx
// ライブ環境バー（現行サイト機能の踏襲）: 日時（秒まで毎秒更新）+ 現在地 + 天気
// 天気は自サイトの /api/weather プロキシ経由（open-meteo → met.no フォールバック、issue #32 の方式を維持）。
// 位置は ipinfo.io の IP ベース（許可ポップアップを出さない現行方針）→ 失敗時は東京にフォールバック。
// 表示地名は bigdatacloud の逆ジオコーディング（日本語）で取得する。
'use client'

import { useEffect, useState } from 'react'
import WxIcon, { type WxKind } from '@/components/mist/WxIcon'

type Weather = { temp: number; label: string; kind: WxKind; source?: string }

const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const

/** WMO weather code → 日本語ラベル */
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

/** WMO weather code → アイコン種別 */
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

function pad(v: number) {
  return String(v).padStart(2, '0')
}

export default function MistEnvBar() {
  const [now, setNow] = useState<Date | null>(null)
  const [place, setPlace] = useState('取得中…')
  const [weather, setWeather] = useState<Weather | null>(null)

  /* 時計: 1秒ごと更新（SSR不一致を避けるためマウント後に開始） */
  useEffect(() => {
    const tick = () => setNow(new Date())
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  /* 天気 + 現在地 */
  useEffect(() => {
    let cancelled = false

    const fetchWeather = async (lat?: number, lon?: number) => {
      const query =
        lat !== undefined && lon !== undefined ? `?lat=${lat}&lon=${lon}` : ''
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
        // IPベースのおおよその位置（許可ポップアップなし）
        const res = await fetch('https://ipinfo.io/json')
        if (!res.ok) throw new Error('IP location failed')
        const data = await res.json()
        if (!data.loc) throw new Error('No location data')
        const [lat, lon] = data.loc.split(',').map(parseFloat)
        await Promise.all([fetchWeather(lat, lon), fetchPlace(lat, lon)])
      } catch {
        // 位置が取れない → 東京の天気にフォールバック
        if (!cancelled) setPlace('東京')
        try {
          await fetchWeather()
        } catch {
          // 完全に失敗した場合は時計のみ表示
        }
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="env">
      <span className="cmd">
        <span className="livedot" aria-hidden />$ date &amp;&amp; weather
      </span>
      <span className="vals">
        <span className="icon">
          <WxIcon kind={weather?.kind ?? 'sun'} />
        </span>
        <span className="temp">{weather ? `${weather.temp}°C` : '--°'}</span>
        <span className="wx jp">
          {weather?.label ?? '—'} · {place}
        </span>
        {/* met.no のデータ利用時はライセンス(NLOD/CC BY 4.0)に基づく帰属表示が必要 */}
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
        <span className="date" suppressHydrationWarning>
          {now
            ? `${now.getFullYear()}.${pad(now.getMonth() + 1)}.${pad(now.getDate())} ${DAYS[now.getDay()]}`
            : ''}
        </span>
        <span className="time" suppressHydrationWarning>
          {now ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` : '--:--:--'}
        </span>
      </span>
    </div>
  )
}
