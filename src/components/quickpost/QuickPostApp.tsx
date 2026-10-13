// src/components/quickpost/QuickPostApp.tsx
// さっと投稿（/post）の画面。スマホから本文・写真（3枚まで）・種類だけで投稿する。
//   ログイン（Face ID / Touch ID のパスキー）→ 投稿、ログイン状態の確認・ログアウト。
//   新しい端末の登録は、管理画面のメールアドレスとパスワードを確かめてからパスキーを作る。
// 写真は選んだらすぐ送り始め（usePhotoUploads）、「投稿する」を押したら送信待ちに入れて、すぐ次を書ける（useOutbox）。
//   送信の様子は画面の上の帯（SendStrip）に出す。送りかけは端末に保存し、閉じても次に開いたときに続きから送る。
// ログイン状態は /api/quickpost/session で確かめる（Cookie は HttpOnly なので画面からは読めない）。
// 下書き（本文・タイトル・種類）はこの端末にだけ保存し、送信待ちに入れたら消す（src/lib/quickpost/drafts.ts）。
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser'
import SodaIcon from '@/components/soda/SodaIcon'
import {
  clearDraft,
  freshDraft,
  isBlankDraft,
  openTab,
  rememberTab,
  saveDraft,
  type Draft,
  type DraftStores,
} from '@/lib/quickpost/drafts'
import { LIMITS, photoTypeOf, POST_TYPES } from '@/lib/quickpost/input'
import { stripView, type OutboxItem } from '@/lib/quickpost/outbox'
import { TYPE_LABELS } from '@/lib/timeline'
import { ApiError, call } from './api'
import { contentDigest } from './digest'
import { PhotoError } from './photo'
import SendStrip from './SendStrip'
import { usePhotoUploads, type PhotoView } from './usePhotoUploads'
import { useOutbox } from './useOutbox'

type Limits = { text: number; title: number; images: number; photoBytes: number }

type SessionInfo = {
  loggedIn: true
  device: {
    name: string
    createdAt: string
    lastUsedAt: string
    idleUntil: string
    expiresAt: string
  }
  others: { name: string; lastUsedAt: string }[]
  passkeys: { name: string; createdAt: string; lastUsedAt: string | null; backedUp: boolean }[]
  limits: Limits
}

type View = 'loading' | 'login' | 'register' | 'compose' | 'account' | 'offline'

/** ログインが切れたときの知らせ（送信待ちがあるときは画面の上の帯が同じことを伝えるので出さない） */
const AUTH_LOST = 'ログインが切れました。もう一度ログインしてください。書いた内容は残っています。'

/** 写真1枚の送信上限（サーバーの上限から少し余裕を取る） */
const PHOTO_MARGIN = 64 * 1024

/** 下書きの保存先（ブラウザの外ではどちらも無し。使えない設定のときに例外になることがある） */
function draftStores(): DraftStores {
  let local: Storage | null = null
  let session: Storage | null = null
  try {
    local = window.localStorage
  } catch {
    // 使えないときは保存しない
  }
  try {
    session = window.sessionStorage
  } catch {
    // 同上
  }
  return { local, session }
}

const chars = (s: string) => Array.from(s).length

const tokyoYear = (d: Date) =>
  new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Asia/Tokyo' }).format(d)

/** 「11月10日」。今年でなければ「2027年1月9日」 */
function fmtDay(iso: string): string {
  const d = new Date(iso)
  const withYear = tokyoYear(d) !== tokyoYear(new Date())
  return new Intl.DateTimeFormat('ja-JP', {
    ...(withYear ? { year: 'numeric' } : {}),
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo',
  }).format(d)
}

function fmtAgo(iso: string): string {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000)
  if (days <= 0) return '今日'
  if (days === 1) return '昨日'
  return `${days}日前`
}

/** 送信・パスキーの失敗を、どうすればよいかが分かる文にする */
function messageFor(e: unknown, limits: Limits): string {
  if (e instanceof PhotoError) {
    return e.code === 'too_large'
      ? '写真が大きすぎて縮められませんでした。別の写真を選んでください。'
      : 'この写真は読み込めませんでした。別の写真を選んでください。'
  }
  if (e instanceof ApiError) {
    switch (e.status) {
      case 401:
        return 'ログインが切れました。もう一度ログインしてください。書いた内容は残っています。'
      case 403:
        return 'このページを開き直してから送ってください。'
      case 413:
        return '写真が大きすぎます。別の写真を選んでください。'
      case 415:
        return 'この写真は読み込めませんでした。別の写真を選んでください。'
      case 409:
        return 'まだ前の送信を受け付けている途中です。少し待ってから、もう一度「投稿する」を押してください。書いた内容は残っています。'
      case 429:
        return '短い時間に送りすぎています。少し待ってから送ってください。'
      case 400:
        if (e.code === 'text_too_long') return `本文は${limits.text}文字までです。`
        if (e.code === 'title_too_long') return `タイトルは${limits.title}文字までです。`
        if (e.code === 'invalid_images') return '写真をもう一度選び直してください。'
        return '入力を確かめてください。'
    }
  }
  return '送れませんでした。電波のよい所でもう一度送ってください。書いた内容は残っています。'
}

function passkeyMessage(e: unknown, mode: 'login' | 'register'): string {
  const { name, code } = (e ?? {}) as { name?: string; code?: string }
  if (code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED' || name === 'InvalidStateError') {
    return 'この端末（iCloud キーチェーン）にはもうパスキーがあります。「ログインする」から入ってください。'
  }
  if (name === 'NotAllowedError' || name === 'AbortError') {
    return mode === 'login'
      ? 'ログインできませんでした。キャンセルしたか、この端末にパスキーがありません。初めての端末なら「この端末を登録」から始めてください。'
      : '登録をキャンセルしました。パスワードをもう一度入れて「確認して登録する」を押してください。'
  }
  if (e instanceof ApiError) {
    if (e.status === 401 && mode === 'register') {
      return '確認できませんでした。メールアドレスとパスワードを確かめてください（5回続けて間違えると10分ロックされます）。'
    }
    if (e.code === 'unknown_passkey') {
      return 'このパスキーは使えなくなっています（管理画面で削除されています）。「この端末を登録」からもう一度登録してください。'
    }
    if (e.code === 'challenge_expired') return '時間が経ちすぎました。もう一度押してください。'
    if (e.status === 429)
      return '短い時間に試しすぎています。少し待ってからもう一度お試しください。'
  }
  return mode === 'login'
    ? 'ログインできませんでした。もう一度お試しください。'
    : '登録できませんでした。もう一度お試しください。'
}

export default function QuickPostApp() {
  const [view, setView] = useState<View>('loading')
  const [info, setInfo] = useState<SessionInfo | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  /** 「投稿する」で写真の縮小を待っている間（たいてい一瞬） */
  const [preparing, setPreparing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [webauthn, setWebauthn] = useState(true)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  /** このタブの ID（下書きはタブごとに保存する。src/lib/quickpost/drafts.ts） */
  const tabRef = useRef('')
  /** 予約中の下書きの自動保存 */
  const autosaveRef = useRef<number | null>(null)
  /** 開いたときの下書き（書き換えるまでは保存しない。開いただけのタブが、ほかのタブで送られた下書きを書き戻さないように） */
  const openedDraftRef = useRef<Draft | null>(null)

  const limits: Limits = info?.limits ?? { ...LIMITS, photoBytes: 4 * 1024 * 1024 }

  /** ログインが切れた（写真や投稿の送信で 401）: ログイン画面へ。書いた内容と送りかけは残り、ログインし直すと続きから送る */
  const authLost = useCallback(() => {
    setInfo(null)
    setView('login')
    setError(AUTH_LOST)
  }, [])

  const uploads = usePhotoUploads({
    maxBytes: limits.photoBytes - PHOTO_MARGIN,
    onAuthLost: authLost,
  })
  const outbox = useOutbox({ loggedIn: Boolean(info), onAuthLost: authLost })
  const photos = uploads.photos
  const { retryFailed } = uploads

  // 画面が変わったら見出しにフォーカスを移す（読み上げで今いる画面が分かるように）
  useEffect(() => {
    if (view !== 'loading') headingRef.current?.focus()
  }, [view])

  // iOS で :active の押した表示を出すため（サイト本体と同じ。インラインスクリプトは使わない）
  useEffect(() => {
    const noop = () => {}
    document.addEventListener('touchstart', noop, { passive: true })
    return () => document.removeEventListener('touchstart', noop)
  }, [])

  // 電波が戻ったら、送れなかった写真を送り直す（送信待ちの分は useOutbox が受け持つ）
  useEffect(() => {
    window.addEventListener('online', retryFailed)
    return () => window.removeEventListener('online', retryFailed)
  }, [retryFailed])

  // ログインし直したら、ログイン切れで送れなかった写真を送り直す
  const loggedInNow = Boolean(info)
  useEffect(() => {
    if (loggedInNow) retryFailed()
  }, [loggedInNow, retryFailed])

  const refresh = useCallback(async (next?: View) => {
    try {
      const s = await call<SessionInfo | { loggedIn: false }>('/api/quickpost/session')
      if (s.loggedIn) {
        setInfo(s)
        setView(next ?? 'compose')
      } else {
        setInfo(null)
        const wantsRegister = new URLSearchParams(window.location.search).get('step') === 'register'
        setView(wantsRegister ? 'register' : 'login')
      }
    } catch {
      setView('offline')
    }
  }, [])

  useEffect(() => {
    setWebauthn(browserSupportsWebAuthn())
    const opened = openTab(draftStores())
    const first = opened.draft ?? freshDraft()
    tabRef.current = opened.tab
    openedDraftRef.current = first
    setDraft(first)
    void refresh()
  }, [refresh])

  // 下書きを自動保存（少し間を置いてまとめて書く。このタブの分だけ。開いたままの下書きは書かない）。
  // いま書いている下書きのキーは、すぐタブに覚える（読み込み直したときに引き取り直せるように）
  useEffect(() => {
    if (!draft || draft === openedDraftRef.current) return
    rememberTab(draftStores(), tabRef.current, draft)
    const t = window.setTimeout(() => {
      autosaveRef.current = null
      saveDraft(draftStores(), tabRef.current, draft)
    }, 400)
    autosaveRef.current = t
    return () => {
      window.clearTimeout(t)
      if (autosaveRef.current === t) autosaveRef.current = null
    }
  }, [draft])

  const go = (v: View) => {
    setError('')
    setView(v)
  }

  // ── ログイン・登録 ──

  async function login() {
    setBusy(true)
    setError('')
    try {
      const optionsJSON = await call<Parameters<typeof startAuthentication>[0]['optionsJSON']>(
        '/api/quickpost/login/options',
        {},
      )
      const response = await startAuthentication({ optionsJSON })
      await call('/api/quickpost/login/verify', response)
      await refresh('compose')
    } catch (e) {
      setError(passkeyMessage(e, 'login'))
    } finally {
      setBusy(false)
    }
  }

  async function register(ev: React.FormEvent) {
    ev.preventDefault()
    setBusy(true)
    setError('')
    try {
      const optionsJSON = await call<Parameters<typeof startRegistration>[0]['optionsJSON']>(
        '/api/quickpost/register/options',
        { email, password },
      )
      // パスワードは確認に使ったら画面からも消す
      setPassword('')
      const response = await startRegistration({ optionsJSON })
      await call('/api/quickpost/register/verify', response)
      setEmail('')
      window.history.replaceState(null, '', '/post')
      await refresh('compose')
    } catch (e) {
      setPassword('')
      setError(passkeyMessage(e, 'register'))
    } finally {
      setBusy(false)
    }
  }

  async function logout(scope: 'this' | 'all') {
    setBusy(true)
    setError('')
    try {
      await call('/api/quickpost/logout', { scope })
      setInfo(null)
      go('login')
    } catch {
      setError('ログアウトできませんでした。もう一度お試しください。')
    } finally {
      setBusy(false)
    }
  }

  // ── 投稿 ──

  function addPhotos(files: FileList | null) {
    if (!files) return
    const room = limits.images - photos.length
    const picked = Array.from(files)
      // 形式が空で渡される写真（HEIC・AVIF など）は拡張子から形式を補って判定する
      .filter((f) => photoTypeOf(f.type, f.name).startsWith('image/'))
      .slice(0, Math.max(0, room))
    // 選んだらすぐ縮小して送り始める（本文を書いている間に送り終える）
    if (picked.length) uploads.add(picked)
    if (files.length > room) setError(`写真は${limits.images}枚までです。`)
    if (fileRef.current) fileRef.current.value = ''
  }

  /** 「投稿する」: 送信待ちに入れて、すぐ次を書けるようにする（送信は画面の上の帯で進む） */
  async function submit() {
    if (!draft || preparing) return
    const text = draft.text.trim()
    if (!text) {
      setError('本文を書いてください。')
      return
    }
    if (chars(text) > limits.text) {
      setError(`本文は${limits.text}文字までです。`)
      return
    }
    const broken = photos.find((p) => p.problem)
    if (broken) {
      setError(
        broken.problem === 'too_large'
          ? '写真が大きすぎて縮められませんでした。外して別の写真を選んでください。'
          : 'この写真は読み込めませんでした。外して別の写真を選んでください。',
      )
      return
    }
    setError('')
    // 予約中の自動保存は止める（送信待ちに入れたあとに、送った下書きを書き戻さない）
    if (autosaveRef.current !== null) {
      window.clearTimeout(autosaveRef.current)
      autosaveRef.current = null
    }
    setPreparing(true)
    try {
      // 写真の縮小と指紋がそろうまで待つ（たいてい選んだ時点で終わっている）
      const handed = await uploads.handoff()
      const title = draft.showTitle ? draft.title : undefined
      // 送る内容の指紋。受付番号ですでに投稿済みだったとき、同じ内容かを見分ける
      // （写真は ID ではなく中身の指紋で比べる。直すで戻した写真も同じ指紋のまま）
      const digest = await contentDigest(
        JSON.stringify([text, title ?? '', draft.postType, handed.prints]),
      )
      const item: OutboxItem = {
        key: draft.key,
        text,
        ...(title !== undefined ? { title } : {}),
        postType: draft.postType,
        photos: handed.photos.map((p, i) => ({
          id: p.id,
          mediaId: handed.mediaIds[i],
          print: handed.prints[i],
        })),
        digest,
        createdAt: Date.now(),
        attempts: 0,
        nextAt: 0,
        problem: null,
      }
      const kept = await outbox.enqueue(item, handed.photos)
      // 送信待ちに入れたら、下書きは片付けて次を書けるようにする
      clearDraft(draftStores(), tabRef.current, draft)
      setDraft(freshDraft())
      if (!kept) {
        setError('この端末に保存できないため、送り終えるまでこの画面を閉じないでください。')
      }
    } catch (e) {
      setError(messageFor(e, limits))
    } finally {
      setPreparing(false)
    }
  }

  /** 「直す」: 送れなかった投稿を入力欄に戻す（いま書いている内容があるときは戻さない） */
  async function edit(key: string) {
    if (!draft) return
    if (!isBlankDraft(draft) || photos.length > 0) {
      setView('compose')
      setError('いま書いている内容を送るか消してから「直す」を押してください。')
      return
    }
    const back = await outbox.takeBack(key)
    if (back.status === 'busy') {
      setView('compose')
      setError(
        'いま送っているところです。送り終えるか、送れなかったら、もう一度「直す」を押してください。',
      )
      return
    }
    if (back.status !== 'ok') return
    const { item } = back
    setDraft({
      text: item.text,
      title: item.title ?? '',
      showTitle: Boolean(item.title),
      postType: item.postType,
      key: item.key,
    })
    uploads.restore(back.photos)
    setError('')
    setView('compose')
  }

  // ── 描画 ──

  const loggedIn = Boolean(info)
  const textCount = draft ? chars(draft.text) : 0
  const strip = stripView({
    items: outbox.items,
    progress: outbox.progress,
    resumed: outbox.resumed,
    // 確かめている間は「ログインが切れました」を出さない
    loggedOut: !loggedIn && view !== 'loading',
    done: outbox.done,
    now: Date.now(),
  })
  const stripText =
    strip.kind === 'sending'
      ? strip.label
      : strip.kind === 'failed'
        ? strip.message
        : strip.kind === 'done'
          ? '投稿しました'
          : ''

  // 送信待ちの帯がログインを促しているときは、同じ知らせを重ねて出さない
  const shownError = error === AUTH_LOST && strip.kind === 'failed' ? '' : error
  const errorBox = shownError ? (
    <p className="s-qp-error" role="alert">
      {shownError}
    </p>
  ) : null

  let body: React.ReactNode = null

  if (view === 'loading' || !draft) {
    body = (
      <p className="s-qp-note s-qp-center" role="status">
        確認しています…
      </p>
    )
  } else if (view === 'offline') {
    body = (
      <section className="s-qp-card s-qp-center" aria-labelledby="qp-h">
        <h1 id="qp-h" ref={headingRef} tabIndex={-1} className="s-qp-h">
          つながりませんでした
        </h1>
        <p className="s-qp-note">電波のよい所で、もう一度読み込んでください。</p>
        <button type="button" className="s-pill is-solid s-qp-wide" onClick={() => void refresh()}>
          もう一度読み込む
        </button>
      </section>
    )
  } else if (view === 'login') {
    body = (
      <>
        <section className="s-qp-card s-qp-center" aria-labelledby="qp-h">
          <SodaIcon name="face" className="s-qp-bigico" />
          <h1 id="qp-h" ref={headingRef} tabIndex={-1} className="s-qp-h">
            パスキーでログイン
          </h1>
          <p className="s-qp-note">
            Face ID・Touch ID で確認します。
            <br />
            パスワードは使いません。
          </p>
          {webauthn ? (
            <button
              type="button"
              className="s-pill is-solid s-qp-wide"
              onClick={() => void login()}
              disabled={busy}
            >
              <SodaIcon name="face" />
              {busy ? '確認しています…' : 'ログインする'}
            </button>
          ) : (
            <p className="s-qp-note">
              このブラウザはパスキーに対応していません。Safari か Chrome で開いてください。
            </p>
          )}
          {errorBox}
        </section>
        <button type="button" className="s-qp-link s-qp-center" onClick={() => go('register')}>
          初めての端末は「この端末を登録」から
        </button>
      </>
    )
  } else if (view === 'register') {
    body = (
      <>
        <section className="s-qp-card" aria-labelledby="qp-h">
          <SodaIcon name="key" className="s-qp-bigico" />
          <h1 id="qp-h" ref={headingRef} tabIndex={-1} className="s-qp-h s-qp-center">
            この端末を登録
          </h1>
          {/* list-style を消すと Safari が一覧として読まないため role を付ける */}
          <ol className="s-qp-steps" role="list">
            <li>管理画面のメールアドレスとパスワードを入れる</li>
            <li>「確認して登録する」を押す</li>
            <li>Face ID・Touch ID で確認したら完了</li>
          </ol>
          <form className="s-qp-form" onSubmit={(ev) => void register(ev)}>
            <label className="s-qp-label" htmlFor="qp-email">
              メールアドレス
            </label>
            <input
              id="qp-email"
              className="s-qp-input"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="s-qp-label" htmlFor="qp-password">
              パスワード
            </label>
            <input
              id="qp-password"
              className="s-qp-input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              className="s-pill is-solid s-qp-wide"
              disabled={busy || !webauthn}
            >
              <SodaIcon name="face" />
              {busy ? '確認しています…' : '確認して登録する'}
            </button>
          </form>
          {errorBox}
        </section>
        <p className="s-qp-note">
          パスキーは iCloud キーチェーンに入り、このサイトでしか使えません。同じ Apple ID の Mac
          でもそのまま使えます。
          サーバーには公開鍵しか届かないので、サーバーから漏れてもログインには使えません。
        </p>
        <button type="button" className="s-qp-link" onClick={() => go('login')}>
          登録済みの端末は「ログインする」へ
        </button>
      </>
    )
  } else if (view === 'compose') {
    const full = photos.length >= limits.images
    const broken = photos.find((p) => p.problem)
    body = (
      <form
        className="s-qp-compose"
        onSubmit={(ev) => {
          ev.preventDefault()
          void submit()
        }}
        aria-labelledby="qp-h"
      >
        <h1 id="qp-h" ref={headingRef} tabIndex={-1} className="sr-only">
          投稿する
        </h1>
        <label htmlFor="qp-text" className="sr-only">
          本文
        </label>
        <textarea
          id="qp-text"
          className="s-qp-text"
          placeholder="いまどうしてる？"
          value={draft.text}
          onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          rows={6}
          // 「投稿する」で写真の縮小を待つ間（たいてい一瞬）は書き換えない（送る内容と画面をそろえる）
          readOnly={preparing}
        />
        <p className="s-qp-meta">
          <span>写真の位置情報は消して送ります</span>
          <span className={`s-num${textCount > limits.text ? ' is-over' : ''}`}>
            {textCount} / {limits.text}
          </span>
        </p>

        <div className="s-qp-photos">
          {photos.map((p, i) => (
            <div key={p.id} className="s-qp-ph">
              {p.noPreview ? (
                <span
                  className="s-qp-ph-none"
                  role="img"
                  aria-label={`${i + 1}枚目の写真（この端末では表示できません）`}
                >
                  <SodaIcon name="camera" />
                  <span aria-hidden="true">プレビューなし</span>
                </span>
              ) : (
                // プレビューは端末の中の画像（blob:）なので最適化は通さない
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.url}
                  alt={`${i + 1}枚目の写真`}
                  onError={() => uploads.markNoPreview(p.id)}
                />
              )}
              <PhotoBadge photo={p} n={i + 1} />
              <button
                type="button"
                className="s-qp-x"
                aria-label={`${i + 1}枚目の写真を外す`}
                onClick={() => uploads.remove(p.id)}
                disabled={preparing}
              >
                <SodaIcon name="close" />
              </button>
            </div>
          ))}
          {!full && (
            <label className={`s-qp-add${preparing ? ' is-disabled' : ''}`}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => addPhotos(e.target.files)}
                disabled={preparing}
              />
              <SodaIcon name="camera" />
              写真
            </label>
          )}
        </div>
        {broken && (
          <p className="s-qp-note" role="alert">
            {broken.problem === 'too_large'
              ? '大きすぎて縮められない写真があります。'
              : '読み込めない写真があります。'}
            外して、別の写真を選んでください。
          </p>
        )}

        <fieldset className="s-qp-chips">
          <legend className="sr-only">種類</legend>
          {POST_TYPES.map((t) => (
            <label key={t} className="s-qp-chip">
              <input
                type="radio"
                name="qp-type"
                value={t}
                checked={draft.postType === t}
                onChange={() => setDraft({ ...draft, postType: t })}
                disabled={preparing}
              />
              <span>{TYPE_LABELS[t]}</span>
            </label>
          ))}
        </fieldset>

        <button
          type="button"
          className="s-qp-link"
          aria-expanded={draft.showTitle}
          aria-controls="qp-title"
          disabled={preparing}
          onClick={() => {
            const open = !draft.showTitle
            setDraft({ ...draft, showTitle: open })
            // 開いたら入力欄へ（タップの流れの中で呼ぶので iOS でもキーボードが開く）
            if (open) window.setTimeout(() => titleRef.current?.focus(), 0)
          }}
        >
          {draft.showTitle ? '－ タイトルを閉じる' : '＋ タイトルを付ける'}
        </button>
        <div id="qp-title" hidden={!draft.showTitle}>
          <label htmlFor="qp-title-input" className="sr-only">
            タイトル
          </label>
          <input
            id="qp-title-input"
            ref={titleRef}
            className="s-qp-input"
            type="text"
            placeholder="タイトル（なくても投稿できます）"
            maxLength={limits.title}
            enterKeyHint="done"
            readOnly={preparing}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            // タイトル欄の Enter で投稿まで送らない
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
          />
        </div>

        {/* エラーは押したボタンのすぐ上（画面の下）に出す。送信の様子は画面の上の帯 */}
        <div className="s-qp-dock">
          {errorBox}
          <button type="submit" className="s-pill is-solid s-qp-wide" disabled={preparing}>
            <SodaIcon name="pencil" />
            {preparing ? '写真を準備しています…' : '投稿する'}
          </button>
          <p className="s-qp-saved">下書きと送りかけはこの端末に自動で保存</p>
        </div>
      </form>
    )
  } else if (view === 'account' && info) {
    body = (
      <section className="s-qp-account" aria-labelledby="qp-h">
        <h1 id="qp-h" ref={headingRef} tabIndex={-1} className="s-qp-h">
          ログイン状態
        </h1>
        <h2 className="s-qp-sect">この端末</h2>
        <div className="s-qp-dev">
          <p className="s-qp-strong">
            {info.device.name || 'この端末'} <span className="s-qp-tag">ログイン中</span>
          </p>
          <p>ログイン: {fmtDay(info.device.createdAt)}</p>
          <p>
            使わなければ {fmtDay(info.device.idleUntil)} に自動ログアウト（最長{' '}
            {fmtDay(info.device.expiresAt)}）
          </p>
        </div>
        {info.others.length > 0 && (
          <>
            <h2 className="s-qp-sect">ほかにログイン中</h2>
            <ul className="s-qp-list">
              {info.others.map((o, i) => (
                <li key={i} className="s-qp-dev">
                  <p className="s-qp-strong">{o.name || '端末'}</p>
                  <p>最後に使った日: {fmtAgo(o.lastUsedAt)}</p>
                </li>
              ))}
            </ul>
          </>
        )}
        <h2 className="s-qp-sect">登録済みのパスキー</h2>
        <ul className="s-qp-list">
          {info.passkeys.map((p, i) => (
            <li key={i} className="s-qp-dev">
              <p className="s-qp-strong">{p.name || 'パスキー'}</p>
              <p>
                登録: {fmtDay(p.createdAt)}
                {p.lastUsedAt ? ` ・ 最後に使った日: ${fmtAgo(p.lastUsedAt)}` : ''}
              </p>
            </li>
          ))}
        </ul>
        <div className="s-qp-actions">
          <button
            type="button"
            className="s-pill s-qp-wide"
            onClick={() => void logout('this')}
            disabled={busy}
          >
            この端末からログアウト
          </button>
          <button
            type="button"
            className="s-pill s-qp-wide"
            onClick={() => void logout('all')}
            disabled={busy}
          >
            すべての端末からログアウト
          </button>
        </div>
        {errorBox}
        <p className="s-qp-note">
          端末をなくしたら、別の端末から管理画面（パスワード）の「ログイン中の端末」と「パスキー」で消してください。消した瞬間から、その端末は入れません。
          覚えのないパスキーがあれば、すぐに管理画面で削除してください。
        </p>
        <button type="button" className="s-qp-link" onClick={() => go('compose')}>
          投稿に戻る
        </button>
      </section>
    )
  }

  return (
    <div className="soda s-qp">
      <header className="s-qp-bar">
        <div className="s-qp-bar-in">
          {loggedIn ? (
            <Link href="/" className="s-iconbtn" aria-label="サイトに戻る">
              <SodaIcon name="arrow-left" />
            </Link>
          ) : (
            <Link href="/" className="s-qp-logo" aria-label="いわぶちまこと ホームへ">
              MAKOTO
            </Link>
          )}
          <span className="s-qp-ttl" lang="en">
            Post
          </span>
          {loggedIn && (
            <button
              type="button"
              className={`s-qp-state${view === 'account' ? ' is-on' : ''}`}
              onClick={() => go(view === 'account' ? 'compose' : 'account')}
            >
              <SodaIcon name="lock" />
              ログイン中
              <span className="sr-only">
                {view === 'account' ? '（投稿に戻る）' : '（ログイン状態を見る）'}
              </span>
            </button>
          )}
        </div>
      </header>
      <SendStrip
        view={strip}
        onRetry={(key) => void outbox.retry(key)}
        onResend={(key) => void outbox.resend(key)}
        onEdit={(key) => void edit(key)}
      />
      <main
        id="main"
        className={`s-qp-main${view === 'login' || view === 'offline' ? ' is-center' : ''}`}
      >
        {/* 送信の様子を読み上げる（領域は常に置いておく） */}
        <p className="sr-only" role="status" aria-live="polite">
          {stripText}
        </p>
        {body}
      </main>
    </div>
  )
}

/** 写真の送り具合（左下の丸）: 送っている間は輪が伸び、送り終えたら ✓、送れなかったら ! */
function PhotoBadge({ photo, n }: { photo: PhotoView; n: number }) {
  if (photo.status === 'done') {
    return (
      <span className="s-qp-up is-done" role="img" aria-label={`${n}枚目は送信済み`}>
        <SodaIcon name="check" />
      </span>
    )
  }
  if (photo.status === 'failed') {
    return (
      <span
        className="s-qp-up is-failed"
        role="img"
        aria-label={
          photo.problem
            ? `${n}枚目は使えない写真です`
            : `${n}枚目は送れませんでした。投稿するときにもう一度送ります`
        }
      >
        <SodaIcon name="alert" />
      </span>
    )
  }
  const pct = Math.round(photo.progress * 100)
  return (
    <span
      className="s-qp-up"
      role="img"
      aria-label={
        photo.status === 'preparing'
          ? `${n}枚目を準備しています`
          : `${n}枚目を送っています（${pct}%）`
      }
      style={{ '--p': pct } as React.CSSProperties}
    />
  )
}
