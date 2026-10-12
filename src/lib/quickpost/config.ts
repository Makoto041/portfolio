// src/lib/quickpost/config.ts
// さっと投稿（/post）の設定値。ログインの期限・Cookie 名・回数制限などをここに集める。
import { SITE_ORIGIN, SITE_URL } from '@/lib/siteUrl'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const isProd = process.env.NODE_ENV === 'production'

export const QP = {
  /** パスキーの「サイト名」（端末のパスキー一覧に出る） */
  rpName: 'MAKOTO',
  /** パスキーを結びつけるドメイン（サブドメインを含めない完全一致） */
  rpID: new URL(SITE_URL).hostname,
  /** 受け付ける送信元（Origin ヘッダー・パスキーの origin） */
  origin: SITE_ORIGIN,

  /** 本番は __Host- 接頭辞（Secure・Path=/・Domain なしを強制し、サブドメインから上書きされない） */
  sessionCookie: isProd ? '__Host-mk_post' : 'mk_post',
  challengeCookie: isProd ? '__Host-mk_post_chal' : 'mk_post_chal',
  /** 「＋ 投稿」ボタンを出すための目印（中身は 1 だけ。認証には使わない） */
  hintCookie: 'mk_post_ui',
  secureCookies: isProd,

  /** 使わなければ自動ログアウトするまで */
  idleMs: 30 * DAY,
  /** 使っていてもログインし直すまで（ログインした時点から） */
  absoluteMs: 90 * DAY,
  /** 最後に使った日時の更新はこの間隔に1回（DB への書き込みを減らす） */
  touchEveryMs: HOUR,
  /** パスキーの確認値（チャレンジ）の有効期限 */
  challengeTtlMs: 5 * MINUTE,

  /** 1台あたりの回数制限（1時間ごとの枠） */
  rate: { windowMs: HOUR, posts: 30, photos: 60 },
  /** ログイン前の API（パスキー・パスワード確認）の IP ごとの回数制限（インスタンス内・ベストエフォート） */
  ipRate: { windowMs: MINUTE, max: 12 },

  /** 写真1枚の受信上限（Vercel の本文上限 4.5MB より小さく。スマホ側で縮小してから送る） */
  maxPhotoBytes: 4 * 1024 * 1024,
  /** 保存する写真の長辺 */
  maxPhotoEdge: 2560,
  /** 画像として読み込む画素数の上限（巨大画像による負荷を防ぐ） */
  maxInputPixels: 64_000_000,
  /** JSON の受信上限 */
  maxJsonBytes: 64 * 1024,
} as const

/** Cookie の共通属性（HttpOnly は Cookie ごとに決める） */
export const COOKIE_BASE = {
  path: '/',
  secure: QP.secureCookies,
} as const
