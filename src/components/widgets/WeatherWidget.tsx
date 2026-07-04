'use client'

import { useEffect, useState } from 'react'

type Wx = { temp: string; icon: string; location: string } | null

export default function WeatherWidget({ className = '' }: { className?: string }) {
  const [wx, setWx] = useState<Wx>(null)
  const [now, setNow] = useState(() => fmt())
  const [isTimeVisible, setIsTimeVisible] = useState(true)

  /* 時計（1秒ごとにチェックして分が変わったら更新） */
  useEffect(() => {
    const updateTime = () => {
      const newTime = fmt()
      if (newTime !== now) {
        // 分が変わった時に短いフェードアニメーション
        setIsTimeVisible(false)
        setTimeout(() => {
          setNow(newTime)
          setIsTimeVisible(true)
        }, 150)
      }
    }

    // 1秒ごとにチェック（正確な時刻更新のため）
    const intervalId = setInterval(updateTime, 1000)
    
    return () => clearInterval(intervalId)
  }, [now])

  /* IP位置情報 → 自サイトの /api/weather プロキシ経由で取得
     （open-meteoへ直接アクセスすると利用者の回線によって到達できない
     ことがあるため、サーバー側で取得・フォールバックする） */
  useEffect(() => {
    const fetchWeather = async (lat?: string, lon?: string, locationName = 'Tokyo') => {
      const query = lat && lon ? `?lat=${parseFloat(lat)}&lon=${parseFloat(lon)}` : ''
      const res = await fetch(`/api/weather${query}`)
      if (!res.ok) throw new Error(`Weather API failed: ${res.status}`)
      const data = await res.json()
      setWx({
        temp: `${data.temp}°C`,
        icon: codeToIcon(data.code),
        location: locationName,
      })
    }

    const getWeatherByIP = async () => {
      try {
        // ipinfo.io でおおよその位置を取得（ポップアップなし）
        const locationResponse = await fetch('https://ipinfo.io/json')
        if (!locationResponse.ok) throw new Error('IP location failed')

        const locationData = await locationResponse.json()
        if (!locationData.loc) throw new Error('No location data')

        const [lat, lon] = locationData.loc.split(',')
        const locationName = locationData.city || locationData.region || 'Unknown'
        await fetchWeather(lat, lon, locationName)
      } catch (error) {
        console.warn('IP-based weather failed, using fallback:', error)
        try {
          // 位置情報なし＝東京の天気にフォールバック
          await fetchWeather()
        } catch (fallbackError) {
          console.warn('Fallback weather also failed:', fallbackError)
          // 完全にフェイルした場合は時刻のみ表示
        }
      }
    }

    getWeatherByIP()
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
          <span className="text-gray-500 dark:text-gray-400">in {wx.location}</span>
        </>
      ) : (
        <>
          <span className="opacity-0">☀️</span>
          <span className="animate-pulse">--°C</span>
          <span className="opacity-0">in --</span>
        </>
      )}
      <span 
        className={`whitespace-nowrap transition-opacity duration-300 ${
          isTimeVisible ? 'opacity-100' : 'opacity-50'
        }`}
      >
        {now}
      </span>
    </div>
  )
}

const fmt = () =>
  new Date().toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
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