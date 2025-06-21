'use client'
import nextDynamic from 'next/dynamic'

const WeatherWidget = nextDynamic(() => import('@/components/WeatherWidget'), {
  ssr: false,
  loading: () => null,
})
export default WeatherWidget
