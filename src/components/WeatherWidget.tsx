'use client'

import { useEffect, useState } from 'react'

type Wx = { temp: string; icon: string } | null

export default function WeatherWidget({ className = '' }: { className?: string }) {
  const [wx, setWx] = useState<Wx>(null)
  const [now, setNow] = useState(() => fmt())

  /* 時計（1 min ごと） */
  useEffect(() => {
    const id = setInterval(() => setNow(fmt()), 60_000)
    return () => clearInterval(id)
  }, [])

  /* 位置情報 → Open-Meteo */
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude.toFixed(
            4,
          )}&longitude=${coords.longitude.toFixed(
            4,
          )}&current=temperature_2m,weather_code&timezone=auto`
          const { current } = await fetch(url).then((r) => r.json())
          setWx({
            temp: Math.round(current.temperature_2m) + '°C',
            icon: codeToIcon(current.weather_code),
          })
        } catch {
          /* ignore */
        }
      },
      () => {
        /* user denied */
      },
    )
  }, [])

  return (
    <div
      className={`glass inline-flex items-center gap-2 px-3 py-1.5 text-xs 
                  text-[color:var(--fg-base)] ${className}`}
    >
      {wx ? (
        <>
          <span>{wx.icon}</span>
          <span>{wx.temp}</span>
        </>
      ) : (
        <>
          <span className="opacity-0">☀️</span>
          <span className="animate-pulse">--°C</span>
        </>
      )}
      <span className="whitespace-nowrap">{now}</span>
    </div>
  )
}

const fmt = () =>
  new Date().toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const codeToIcon = (c: number) => {
  if ([0].includes(c)) return '☀️'
  if ([1, 2].includes(c)) return '⛅'
  if ([3].includes(c)) return '☁️'
  if ([45, 48].includes(c)) return '🌫️'
  if ([51, 53, 55, 56, 57].includes(c)) return '🌦️'
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(c)) return '🌧️'
  if ([71, 73, 75, 77, 85, 86].includes(c)) return '❄️'
  if ([95, 96, 99].includes(c)) return '⛈️'
  return '❔'
}