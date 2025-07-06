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

  /* IP位置情報 → Open-Meteo (ポップアップなし) */
  useEffect(() => {
    const getWeatherByIP = async () => {
      try {
        // ipinfo.io を使用（より安定したサービス）
        const locationResponse = await fetch('https://ipinfo.io/json?token=')
        if (!locationResponse.ok) throw new Error('IP location failed')
        
        const locationData = await locationResponse.json()
        
        if (locationData.loc) {
          const [lat, lon] = locationData.loc.split(',')
          const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${parseFloat(lat).toFixed(
            4,
          )}&longitude=${parseFloat(lon).toFixed(
            4,
          )}&current=temperature_2m,weather_code&timezone=auto`
          
          const weatherResponse = await fetch(weatherUrl)
          if (!weatherResponse.ok) throw new Error('Weather API failed')
          
          const weatherData = await weatherResponse.json()
          
          setWx({
            temp: Math.round(weatherData.current.temperature_2m) + '°C',
            icon: codeToIcon(weatherData.current.weather_code),
          })
        } else {
          throw new Error('No location data')
        }
      } catch (error) {
        console.warn('IP-based weather failed, using fallback:', error)
        await getFallbackWeather()
      }
    }
    
    const getFallbackWeather = async () => {
      try {
        // 東京の座標 (35.6762, 139.6503) - 日本のユーザー向けのデフォルト
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503&current=temperature_2m,weather_code&timezone=Asia/Tokyo`
        const weatherResponse = await fetch(weatherUrl)
        
        if (weatherResponse.ok) {
          const weatherData = await weatherResponse.json()
          setWx({
            temp: Math.round(weatherData.current.temperature_2m) + '°C',
            icon: codeToIcon(weatherData.current.weather_code),
          })
        }
      } catch (error) {
        console.warn('Fallback weather also failed:', error)
        // 完全にフェイルした場合は時刻のみ表示
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