// src/components/quickpost/QuickPostApp.tsx
// さっと投稿（/post）の画面。スマホから本文・写真（3枚まで）・種類だけで投稿する。
//   ログイン（Face ID / Touch ID のパスキー）→ 投稿 → 送信中 → 完了、ログイン状態の確認・ログアウト。
//   新しい端末の登録は、管理画面のメールアドレスとパスワードを確かめてからパスキーを作る。
// ログイン状態は /api/quickpost/session で確かめる（Cookie は HttpOnly なので画面からは読めない）。
// 下書き（本文・タイトル・種類）はこの端末にだけ保存し、投稿できたら消す（src/lib/quickpost/drafts.ts）。
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
  canSaveBeforeSend,
  clearDraft,
  freshDraft,
  loadDraft,
  rememberTabDraft,
  saveDraft,
  storedDraft,
  type Draft,
  type DraftStores,
} from '@/lib/quickpost/drafts'
import { LIMITS, photoTypeOf, POST_TYPES } from '@/lib/quickpost/input'
import { TYPE_LABELS } from '@/lib/timeline'
import { contentDigest } from './digest'
import { PhotoError, photoPrint, prepareForUpload } from './photo'

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

type View = 'loading' | 'login' | 'register' | 'compose' | 'done' | 'account' | 'offline'

type Photo = {
  id: string
  file: File
  url: string
  mediaId?: number
  /** 写真の中身の指紋（最初に送るときに1回だけ取る） */
  print?: string
  noPreview?: boolean
}

type Sending = { step: 'photos'; done: number; total: number } | { step: 'post' }

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

class ApiError extends Error {
  constructor(
    public status: number,
    public code?: string,
  ) {
    super(code ?? String(status))
    this.name = 'ApiError'
  }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok) throw new ApiError(res.status, data?.error)
  return data as T
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
  const [photos, setPhotos] = useState<Photo[]>([])
  const [sending, setSending] = useState<Sending | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [doneId, setDoneId] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [webauthn, setWebauthn] = useState(true)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<Photo[]>([])
  photosRef.current = photos
  /** このタブが最後に保存した（または読み込んだ）下書き。ほかのタブがあとから直したかを見分ける */
  const lastSavedRef = useRef<Draft | null>(null)

  const limits: Limits = info?.limits ?? { ...LIMITS, photoBytes: 4 * 1024 * 1024 }

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

  // 離れるときに写真のプレビュー用 URL を手放す
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

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
    const loaded = loadDraft(draftStores())
    lastSavedRef.current = loaded
    setDraft(loaded ?? freshDraft())
    void refresh()
  }, [refresh])

  // 下書きを自動保存（少し間を置いてまとめて書く）。このタブの下書きのキーはすぐ覚える
  useEffect(() => {
    if (!draft) return
    rememberTabDraft(draftStores(), draft.key)
    const t = window.setTimeout(() => {
      saveDraft(draftStores(), draft)
      lastSavedRef.current = draft
    }, 400)
    return () => window.clearTimeout(t)
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
      .map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) }))
    if (picked.length) setPhotos((prev) => [...prev, ...picked])
    if (files.length > room) setError(`写真は${limits.images}枚までです。`)
    if (fileRef.current) fileRef.current.value = ''
  }

  /** この端末で描けない写真（HEIC など）は、壊れた画像の代わりに目印を出す。送ればサーバーが中身で判断する */
  function markNoPreview(id: string) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, noPreview: true } : p)))
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((p) => p.id !== id)
    })
  }

  async function submit() {
    if (!draft || sending) return
    const text = draft.text.trim()
    if (!text) {
      setError('本文を書いてください。')
      return
    }
    if (chars(text) > limits.text) {
      setError(`本文は${limits.text}文字までです。`)
      return
    }
    setError('')
    const queue = [...photos]
    try {
      const ids: number[] = []
      const prints: string[] = []
      for (let i = 0; i < queue.length; i++) {
        const photo = queue[i]
        setSending({ step: 'photos', done: i, total: queue.length })
        // 指紋は1回だけ取って覚えておく（送り直しでファイルを読み直さない。iOS では時間が経つと読めなくなることがある）
        const print = photo.print ?? (await photoPrint(photo.file))
        prints.push(print)
        if (!photo.print) {
          queue[i] = { ...photo, print }
          setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, print } : p)))
        }
        if (photo.mediaId) {
          ids.push(photo.mediaId)
          continue
        }
        const blob = await prepareForUpload(photo.file, limits.photoBytes - PHOTO_MARGIN)
        const res = await fetch('/api/quickpost/photo', {
          method: 'POST',
          headers: { 'content-type': blob.type || 'image/jpeg' },
          body: blob,
          credentials: 'same-origin',
          cache: 'no-store',
        })
        const data = (await res.json().catch(() => null)) as { id?: number; error?: string } | null
        if (!res.ok || typeof data?.id !== 'number') throw new ApiError(res.status, data?.error)
        const mediaId = data.id
        // 送れた写真は覚えておき、送り直しのときにもう一度送らない
        queue[i] = { ...queue[i], mediaId }
        setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, mediaId } : p)))
        ids.push(mediaId)
      }

      setSending({ step: 'post' })
      const title = draft.showTitle ? draft.title : undefined
      // 送る内容の指紋。サーバーの受付票に残り、同じキーの送り直しで「すでに投稿済み」と返るときに一緒に返ってくる。
      // それと比べて、応答が届かなかったあとに直して送り直したか（別のタブで違う内容を送ったか）を見分ける。
      // 写真は ID ではなく中身の指紋で比べる（読み込み直すと選び直しになって ID は変わるが、同じファイルなら指紋は同じ。
      // 端末が選び直しのたびに写真を変換し直して中身が変わる場合は、直したとみなして下書きを残す側に倒れる）
      const digest = await contentDigest(
        JSON.stringify([text, title ?? '', draft.postType, prints]),
      )
      const body = { text, title, postType: draft.postType, images: ids, key: draft.key, digest }
      // 送る前に下書きをすぐ保存する（自動保存を待たない）。応答が届かないまま読み込み直しても、同じキーで送り直せるように。
      // ただし、同じ下書きを開いたほかのタブがあとから直していたら、このタブの古い内容で上書きしない
      const stores = draftStores()
      if (canSaveBeforeSend(storedDraft(stores, draft.key), lastSavedRef.current)) {
        saveDraft(stores, draft)
        lastSavedRef.current = draft
      }
      // 同じ下書きをまだ送っている途中（409）なら、少し待って送り直す（2回目以降は最初の投稿が返る）
      type Created = { id: number; duplicate?: boolean; digest?: string | null }
      let created: Created | null = null
      for (let attempt = 0; !created; attempt++) {
        try {
          created = await call<Created>('/api/quickpost/posts', body)
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 409) || attempt >= 4) throw e
          await new Promise((r) => window.setTimeout(r, 1500))
        }
      }

      if (created.duplicate && created.digest !== digest) {
        // このキーではすでに別の内容が投稿されていた（応答だけが届かずに直して送り直した、または別のタブが先に送った）。
        // 今の内容は消さずに残し、別の投稿として送れるようキーを新しくする
        const next = { ...draft, key: crypto.randomUUID() }
        clearDraft(stores, draft)
        rememberTabDraft(stores, next.key)
        saveDraft(stores, next)
        lastSavedRef.current = next
        setDraft(next)
        setError(
          '前に送った内容はすでに投稿されていました。直した内容も投稿するなら、もう一度「投稿する」を押してください。',
        )
        return
      }

      queue.forEach((p) => URL.revokeObjectURL(p.url))
      setPhotos([])
      clearDraft(stores, draft)
      lastSavedRef.current = null
      setDraft(freshDraft())
      setDoneId(created.id)
      go('done')
    } catch (e) {
      setError(messageFor(e, limits))
      if (e instanceof ApiError && e.status === 401) {
        setInfo(null)
        setView('login')
      }
    } finally {
      setSending(null)
    }
  }

  // ── 描画 ──

  const loggedIn = Boolean(info)
  const textCount = draft ? chars(draft.text) : 0
  const sendingText = sending
    ? sending.step === 'photos'
      ? `写真を送っています（${sending.done + 1} / ${sending.total}）`
      : '投稿しています…'
    : ''

  const errorBox = error ? (
    <p className="s-qp-error" role="alert">
      {error}
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
          // 送っている間は書き換えない（送った内容と下書きを食い違わせない）
          readOnly={Boolean(sending)}
          rows={6}
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
                <img src={p.url} alt={`${i + 1}枚目の写真`} onError={() => markNoPreview(p.id)} />
              )}
              <button
                type="button"
                className="s-qp-x"
                aria-label={`${i + 1}枚目の写真を外す`}
                onClick={() => removePhoto(p.id)}
                disabled={Boolean(sending)}
              >
                <SodaIcon name="close" />
              </button>
            </div>
          ))}
          {!full && (
            <label className={`s-qp-add${sending ? ' is-disabled' : ''}`}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={(e) => addPhotos(e.target.files)}
                disabled={Boolean(sending)}
              />
              <SodaIcon name="camera" />
              写真
            </label>
          )}
        </div>

        <fieldset className="s-qp-chips" disabled={Boolean(sending)}>
          <legend className="sr-only">種類</legend>
          {POST_TYPES.map((t) => (
            <label key={t} className="s-qp-chip">
              <input
                type="radio"
                name="qp-type"
                value={t}
                checked={draft.postType === t}
                onChange={() => setDraft({ ...draft, postType: t })}
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
          disabled={Boolean(sending)}
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
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            readOnly={Boolean(sending)}
            // タイトル欄の Enter で投稿まで送らない
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            }}
          />
        </div>

        {/* 送信中の様子とエラーは、押したボタンのすぐ上（画面の下）に出す */}
        <div className="s-qp-dock">
          {sending && (
            <div className="s-qp-paper">
              <p className="s-qp-strong" aria-hidden="true">
                {sendingText}
              </p>
              <div className="s-qp-track" aria-hidden="true">
                <i
                  style={{
                    width:
                      sending.step === 'photos'
                        ? `${Math.round((sending.done / (sending.total + 1)) * 100)}%`
                        : '92%',
                  }}
                />
              </div>
              <p className="s-qp-note">
                サーバーで写真を作り直し、位置情報などの撮影データを消してから保存します。
              </p>
            </div>
          )}
          {errorBox}
          <button type="submit" className="s-pill is-solid s-qp-wide" disabled={Boolean(sending)}>
            <SodaIcon name="pencil" />
            {sending ? '送っています…' : '投稿する'}
          </button>
          <p className="s-qp-saved">下書きはこの端末に自動で保存</p>
        </div>
      </form>
    )
  } else if (view === 'done') {
    body = (
      <section className="s-qp-done" aria-labelledby="qp-h">
        <span className="s-qp-check" aria-hidden="true">
          <SodaIcon name="check" />
        </span>
        <h1 id="qp-h" ref={headingRef} tabIndex={-1} className="s-qp-h">
          投稿しました
        </h1>
        <p className="s-qp-note">数秒でタイムラインに出ます。</p>
        <a
          className="s-pill is-solid s-qp-wide"
          href={doneId ? `/timeline#post-${doneId}` : '/timeline'}
        >
          タイムラインで見る
        </a>
        <button type="button" className="s-pill s-qp-wide" onClick={() => go('compose')}>
          続けて投稿する
        </button>
      </section>
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
          <span className="s-qp-ttl">投稿</span>
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
      <main
        id="main"
        className={`s-qp-main${view === 'login' || view === 'offline' ? ' is-center' : ''}`}
      >
        {/* 送信の進み具合を読み上げる（領域は常に置いておく） */}
        <p className="sr-only" role="status" aria-live="polite">
          {sendingText}
        </p>
        {body}
      </main>
    </div>
  )
}
