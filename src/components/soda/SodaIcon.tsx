// src/components/soda/SodaIcon.tsx
// Soda Press の線画アイコン（24px グリッド / 線幅 1.6 / 丸端）。
// サーバー・クライアントどちらからも使える純粋な SVG コンポーネント。
import type { SVGProps } from 'react'

export type SodaIconName =
  | 'home'
  | 'camera'
  | 'book'
  | 'smile'
  | 'menu'
  | 'close'
  | 'mail'
  | 'arrow'
  | 'arrow-left'
  | 'external'
  | 'heart'
  | 'link'
  | 'x'
  | 'instagram'
  | 'github'
  | 'youtube'
  | 'linkedin'
  | 'globe'
  | 'pencil'
  | 'pause'
  | 'play'
  | 'face'
  | 'lock'
  | 'key'

const PATHS: Record<SodaIconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9v11.5h13V9" />
      <path d="M10 20.5V15h4v5.5" />
    </>
  ),
  camera: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="3.5" />
      <path d="M8.5 7 10 4.5h4L15.5 7" />
      <circle cx="12" cy="13.5" r="3.6" />
    </>
  ),
  book: (
    <>
      <path d="M3.5 5.5c2.2-1 5.6-1.1 8.5.6 2.9-1.7 6.3-1.6 8.5-.6v13c-2.2-1-5.6-1.1-8.5.6-2.9-1.7-6.3-1.6-8.5-.6z" />
      <path d="M12 6.1v13" />
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M8.6 14.2c1.8 2.1 5 2.1 6.8 0" />
      <path d="M9.2 9.8h.01M14.8 9.8h.01" strokeWidth={2.2} />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="3" />
      <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  external: (
    <>
      <path d="M14 4.5h5.5V10" />
      <path d="M19.5 4.5 11 13" />
      <path d="M18 14v4.5a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1H10" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z" />,
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
    </>
  ),
  x: (
    <>
      <path d="M4.5 4.5h4.2l10.8 15h-4.2z" />
      <path d="M19.2 4.5l-6.1 6.8M4.8 19.5l6.1-6.8" />
    </>
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.2 6.8h.01" strokeWidth={2.4} />
    </>
  ),
  github: (
    <path d="M9 19c-4 1.3-4-2-5.6-2.5M14.6 21v-3.3a2.9 2.9 0 0 0-.8-2.2c2.7-.3 5.5-1.3 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1-.3-3.4 1.3a11.6 11.6 0 0 0-6 0C6.1 2.8 5.1 3.1 5.1 3.1a4.3 4.3 0 0 0-.1 3.2 4.6 4.6 0 0 0-1.3 3.2c0 4.6 2.8 5.7 5.5 6a2.9 2.9 0 0 0-.8 2.2V21" />
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="m10.2 9.3 4.6 2.7-4.6 2.7z" />
    </>
  ),
  linkedin: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 10.5v6M8 7.5h.01M12 16.5v-3.5a2.5 2.5 0 0 1 5 0v3.5M12 10.5v6" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.5 12h17M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6S9.6 5.8 12 3.4z" />
    </>
  ),
  pencil: (
    <>
      <path d="M4 20l1-4.5L15.5 5a2.1 2.1 0 0 1 3 3L8 18.5z" />
      <path d="M13.5 7l3 3" />
    </>
  ),
  pause: <path d="M9 6v12M15 6v12" strokeWidth={2} />,
  play: <path d="M8.5 6.5v11l9-5.5z" />,
  // Face ID（さっと投稿のログイン）
  face: (
    <>
      <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M9 9v1.5M15 9v1.5M12 9v4h-1M9.5 16c1.5 1 3.5 1 5 0" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="12" r="4" />
      <path d="M12 12h9M18 12v3M21 12v2" />
    </>
  ),
}

type Props = Omit<SVGProps<SVGSVGElement>, 'name'> & { name: SodaIconName }

export default function SodaIcon({ name, className, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`s-ico${className ? ` ${className}` : ''}`}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}

/** SNS プラットフォーム → アイコン名 */
export function socialIcon(platform?: string | null): SodaIconName {
  switch (platform) {
    case 'twitter':
      return 'x'
    case 'instagram':
      return 'instagram'
    case 'github':
      return 'github'
    case 'youtube':
      return 'youtube'
    case 'linkedin':
      return 'linkedin'
    default:
      return 'globe'
  }
}
