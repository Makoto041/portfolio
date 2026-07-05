// src/components/mist/WxIcon.tsx
// 天気の線画SVGアイコン（デザインリファレンスの wxIcon() を移植）
// 24px表示 / viewBox 64 / stroke currentColor / 晴れの光線は28sでゆっくり回転（CSS側 .rays）
import React from 'react'

export type WxKind = 'sun' | 'partly' | 'cloud' | 'fog' | 'rain' | 'snow' | 'thunder'

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const CLOUD_D = 'M19 44a9 9 0 0 1 .8-17.9A13.5 13.5 0 0 1 46 27.5 9.5 9.5 0 0 1 45 46H20Z'

const Cloud = () => <path d={CLOUD_D} {...STROKE} />

export default function WxIcon({ kind }: { kind: WxKind }) {
  return (
    <svg width="24" height="24" viewBox="0 0 64 64" style={{ display: 'block' }} aria-hidden>
      {kind === 'sun' && (
        <>
          <g className="rays">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
              <line key={a} x1="32" y1="6.5" x2="32" y2="13" transform={`rotate(${a} 32 32)`} {...STROKE} />
            ))}
          </g>
          <circle cx="32" cy="32" r="11.5" {...STROKE} />
        </>
      )}
      {kind === 'partly' && (
        <>
          <circle cx="22" cy="21" r="7.5" {...STROKE} />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <line key={a} x1="22" y1="6.5" x2="22" y2="10.5" transform={`rotate(${a} 22 21)`} {...STROKE} />
          ))}
          <g transform="translate(6 8) scale(.86)">
            <Cloud />
          </g>
        </>
      )}
      {kind === 'cloud' && <Cloud />}
      {kind === 'fog' && (
        <>
          <g transform="translate(0 -6) scale(.92)">
            <Cloud />
          </g>
          <line x1="17" y1="50" x2="47" y2="50" {...STROKE} />
          <line x1="22" y1="57" x2="42" y2="57" {...STROKE} />
        </>
      )}
      {kind === 'rain' && (
        <>
          <g transform="translate(0 -5)">
            <Cloud />
          </g>
          <line x1="24" y1="47" x2="21" y2="56" {...STROKE} />
          <line x1="33" y1="47" x2="30" y2="56" {...STROKE} />
          <line x1="42" y1="47" x2="39" y2="56" {...STROKE} />
        </>
      )}
      {kind === 'snow' && (
        <>
          <g transform="translate(0 -5)">
            <Cloud />
          </g>
          <circle cx="24" cy="52" r="2" fill="currentColor" />
          <circle cx="33" cy="56" r="2" fill="currentColor" />
          <circle cx="42" cy="52" r="2" fill="currentColor" />
        </>
      )}
      {kind === 'thunder' && (
        <>
          <g transform="translate(0 -6)">
            <Cloud />
          </g>
          <polyline points="33 42 27 52 34 52 29 61" {...STROKE} />
        </>
      )}
    </svg>
  )
}
