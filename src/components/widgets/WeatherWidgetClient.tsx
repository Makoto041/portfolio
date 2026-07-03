'use client'
import nextDynamic from 'next/dynamic'

// レイアウトシフト防止：ロード中も実物と同じ寸法のスケルトンを表示する
const WeatherWidget = nextDynamic(() => import('@/components/widgets/WeatherWidget'), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="glass inline-flex h-[30px] w-44 animate-pulse items-center rounded-full px-3"
    />
  ),
})
export default WeatherWidget
