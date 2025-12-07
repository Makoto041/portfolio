'use client'
import nextDynamic from 'next/dynamic'

const WeatherWidget = nextDynamic(() => import('@/components/widgets/WeatherWidget'), {
  ssr: false,
  loading: () => null,
})
export default WeatherWidget
