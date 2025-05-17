"use client"

import { useEffect, useState } from "react"

type WeatherState = { temp: string; icon: string } | null

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherState>(null)

  // 現在日時（1 分おきに更新）
  const [now, setNow] = useState<string>(() =>
    formatNow()
  )
  useEffect(() => {
    const id = setInterval(() => setNow(formatNow()), 60_000)
    return () => clearInterval(id)
  }, [])

  // 位置情報 → Open-Meteo
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude.toFixed(
            4
          )}&longitude=${coords.longitude.toFixed(
            4
          )}&current=temperature_2m,weather_code&timezone=auto`
          const { current } = await fetch(url).then((r) => r.json())
          setWeather({
            temp: `${Math.round(current.temperature_2m)}°C`,
            icon: codeToIcon(current.weather_code),
          })
        } catch {
          /* ネットワーク失敗は無視 */
        }
      },
      () => {
        /* ユーザー拒否時は weather=null のまま */
      }
    )
  }, [])

  return (
    <div
      className="glass pointer-events-none absolute right-0 top-0 flex items-center gap-2
                 px-3 py-1.5 text-[0.7rem] text-zinc-800 dark:text-zinc-100"
      style={{
        borderRadius: "var(--radius-s)",
        backdropFilter: "blur(var(--blur-m))",
      }}
    >
      {weather ? (
        <>
          <span>{weather.icon}</span>
          <span>{weather.temp}</span>
        </>
      ) : (
        <span>—</span>
      )}
      <span className="whitespace-nowrap">{now}</span>
    </div>
  )
}

/* util: 日時フォーマット */
function formatNow() {
  return new Date().toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/* util: Open-Meteo weather_code → 絵文字 */
function codeToIcon(code: number): string {
  if ([0].includes(code)) return "☀️"
  if ([1, 2].includes(code)) return "⛅"
  if ([3].includes(code)) return "☁️"
  if ([45, 48].includes(code)) return "🌫️"
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦️"
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧️"
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️"
  if ([95, 96, 99].includes(code)) return "⛈️"
  return "❔"
}