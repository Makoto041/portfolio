// src/app/api/weather/route.ts
// 天気プロキシAPI。
// ブラウザから open-meteo を直接叩くと利用者の回線によって到達できない
// ことがある（日本の一部ISPからタイムアウトする事例あり）ため、
// サーバー側で取得し、失敗時は met.no にフォールバックする。
import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 0 // キャッシュはレスポンスヘッダーで制御

const FETCH_TIMEOUT_MS = 5000
// 東京（位置情報が取れない場合のデフォルト）
const DEFAULT_LAT = 35.6762
const DEFAULT_LON = 139.6503

/** met.no の symbol_code を WMO weather code（open-meteo互換）へ近似変換 */
const METNO_SYMBOL_TO_WMO: Record<string, number> = {
  clearsky: 0,
  fair: 1,
  partlycloudy: 2,
  cloudy: 3,
  fog: 45,
  lightrainshowers: 51,
  rainshowers: 80,
  heavyrainshowers: 82,
  lightrain: 61,
  rain: 63,
  heavyrain: 65,
  lightsleet: 66,
  sleet: 66,
  heavysleet: 67,
  lightsleetshowers: 66,
  sleetshowers: 66,
  heavysleetshowers: 67,
  lightsnow: 71,
  snow: 73,
  heavysnow: 75,
  lightsnowshowers: 85,
  snowshowers: 85,
  heavysnowshowers: 86,
  lightrainandthunder: 95,
  rainandthunder: 95,
  heavyrainandthunder: 95,
  thunder: 95,
}

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** open-meteo から取得（プライマリ） */
async function fetchOpenMeteo(lat: number, lon: number) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,weather_code&timezone=auto`
  const res = await fetchWithTimeout(url)
  if (!res.ok) throw new Error(`open-meteo: ${res.status}`)
  const data = await res.json()
  return {
    temp: Math.round(data.current.temperature_2m),
    code: Number(data.current.weather_code),
    source: 'open-meteo',
  }
}

/** met.no から取得（フォールバック） */
async function fetchMetNo(lat: number, lon: number) {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`
  const res = await fetchWithTimeout(url, {
    headers: {
      // met.no の利用規約でUser-Agentによる識別が必須
      'User-Agent': 'iwabuchi-makoto.com weather-widget (https://iwabuchi-makoto.com)',
    },
  })
  if (!res.ok) throw new Error(`met.no: ${res.status}`)
  const data = await res.json()
  const ts = data?.properties?.timeseries?.[0]
  const temp = ts?.data?.instant?.details?.air_temperature
  const symbol: string =
    ts?.data?.next_1_hours?.summary?.symbol_code ??
    ts?.data?.next_6_hours?.summary?.symbol_code ??
    ''
  // 'lightrain_day' のような接尾辞を除去してWMOコードへ変換
  const base = symbol.split('_')[0]
  return {
    temp: Math.round(Number(temp)),
    code: METNO_SYMBOL_TO_WMO[base] ?? 3,
    source: 'met.no',
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const latRaw = parseFloat(searchParams.get('lat') ?? '')
  const lonRaw = parseFloat(searchParams.get('lon') ?? '')
  // 不正値はデフォルト（東京）に丸める
  const lat = Number.isFinite(latRaw) && Math.abs(latRaw) <= 90 ? latRaw : DEFAULT_LAT
  const lon = Number.isFinite(lonRaw) && Math.abs(lonRaw) <= 180 ? lonRaw : DEFAULT_LON

  try {
    let result
    try {
      result = await fetchOpenMeteo(lat, lon)
    } catch (error) {
      console.warn('Weather: open-meteo failed, falling back to met.no:', error)
      result = await fetchMetNo(lat, lon)
    }

    return NextResponse.json(result, {
      headers: {
        // 10分CDNキャッシュ + 30分stale許容（外部APIへの負荷と応答速度の両立）
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
      },
    })
  } catch (error) {
    console.error('Weather: all providers failed:', error)
    return NextResponse.json({ error: 'Weather unavailable' }, { status: 502 })
  }
}
