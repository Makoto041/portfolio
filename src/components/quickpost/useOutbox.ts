// src/components/quickpost/useOutbox.ts
// さっと投稿（/post）の送信待ち。「投稿する」を押したら端末に保存し（src/components/quickpost/outboxDb.ts）、
// 押した順に1件ずつ送る（写真 → 投稿）。画面はすぐ次を書ける。決まりごとは src/lib/quickpost/outbox.ts。
//   - 送れなかったら、通信の失敗などは時間を空けて自動で送り直す（電波が戻った・画面に戻ったときはすぐ）
//   - ログインが切れたら止め、ログインし直したら続きから送る
//   - 受付番号（下書きのキー）はそのまま使うので、送り直しても投稿は1件（サーバーの受付票）
//   - iPhone の Safari は画面を閉じたあとに送り続ける仕組み（Background Sync）に対応していないため、
//     閉じている間は止まり、次に開いたときに続きから送る
//   - 複数のタブで開いていても、送るのは1つのタブだけ（Web Locks）。ほかのタブには変更を知らせる（BroadcastChannel）
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  asNewPost,
  byCreated,
  classify,
  markFailed,
  nextToSend,
  nextWakeAt,
  resumeAuth,
  retryNow,
  wakeAll,
  type OutboxItem,
  type SendProgress,
} from '@/lib/quickpost/outbox'
import { ApiError, call, uploadPhoto } from './api'
import { deleteItem, loadItems, loadPhoto, saveItem, savePhoto } from './outboxDb'

/** 画面から送信待ちに渡す写真（縮小した写真と、選んだ時点で始めた送信） */
export type HandoffPhoto = { id: string; blob: Blob; upload?: Promise<number> }

type Created = { id: number; duplicate?: boolean; digest?: string | null }

const LOCK = 'mk_post_outbox'
const CHANNEL = 'mk_post_outbox'
/** 「投稿しました」を出しておく時間 */
const DONE_MS = 4000

/** 送信は1つのタブだけで行う（Web Locks が無い環境ではそのまま行う。同じ受付番号なので二重にはならない） */
async function withLock(fn: () => Promise<void>): Promise<void> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (locks?.request) {
    await locks.request(LOCK, () => fn())
    return
  }
  await fn()
}

export function useOutbox(opts: { loggedIn: boolean; onAuthLost: () => void }) {
  const [items, setItems] = useState<OutboxItem[]>([])
  const [progress, setProgress] = useState<SendProgress | null>(null)
  const [resumed, setResumed] = useState(false)
  const [done, setDone] = useState<{ postId: number; until: number } | null>(null)

  const itemsRef = useRef<OutboxItem[]>([])
  /** 選んだ時点で始めた写真の送信（写真の ID ごと。送信待ちが受け持つ） */
  const liveRef = useRef(new Map<string, Promise<number>>())
  /** 端末に保存できなかった送信待ち（読み直したときに消さない） */
  const unsavedRef = useRef(new Set<string>())
  const sendingKeyRef = useRef<string | null>(null)
  const runningRef = useRef(false)
  const againRef = useRef(false)
  const wakeRef = useRef(false)
  const authResumeRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const doneTimerRef = useRef<number | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const loggedInRef = useRef(opts.loggedIn)
  loggedInRef.current = opts.loggedIn
  const onAuthLostRef = useRef(opts.onAuthLost)
  onAuthLostRef.current = opts.onAuthLost
  const runRef = useRef<() => Promise<void>>(async () => {})

  const publish = useCallback((next: OutboxItem[]) => {
    itemsRef.current = [...next].sort(byCreated)
    setItems(itemsRef.current)
    if (itemsRef.current.length === 0) setResumed(false)
  }, [])

  /** 「投稿しました」を下げる（あとで送れなかった・画面に戻したときに、前の「投稿しました」を出し直さない） */
  const clearDone = useCallback(() => {
    if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current)
    doneTimerRef.current = null
    setDone(null)
  }, [])

  const notifyOthers = useCallback(() => {
    try {
      channelRef.current?.postMessage('changed')
    } catch {
      // 知らせられなくても、ほかのタブは画面に戻ったときに読み直す
    }
  }, [])

  /** 1件を書き換えて保存する（受付番号が変わったときは previousKey の分と入れ替える） */
  const update = useCallback(
    async (next: OutboxItem, previousKey?: string) => {
      const target = previousKey ?? next.key
      // 送れた・画面に戻したあとに届いた書き換えで、消したものを保存し直さない
      if (!itemsRef.current.some((i) => i.key === target)) return
      publish(itemsRef.current.map((i) => (i.key === target ? next : i)))
      const saved = await saveItem(next, previousKey)
      if (previousKey) unsavedRef.current.delete(previousKey)
      if (saved) unsavedRef.current.delete(next.key)
      else unsavedRef.current.add(next.key)
      notifyOthers()
    },
    [notifyOthers, publish],
  )

  const remove = useCallback(
    async (item: OutboxItem) => {
      publish(itemsRef.current.filter((i) => i.key !== item.key))
      unsavedRef.current.delete(item.key)
      for (const p of item.photos) liveRef.current.delete(p.id)
      await deleteItem(item)
      notifyOthers()
    },
    [notifyOthers, publish],
  )

  /** 保存した中身から読み直す（ほかのタブが送った・直した分を反映。保存できなかった分は残す） */
  const reload = useCallback(async () => {
    const stored = await loadItems()
    const keys = new Set(stored.map((i) => i.key))
    const unsaved = itemsRef.current.filter(
      (i) => unsavedRef.current.has(i.key) && !keys.has(i.key),
    )
    let next = [...stored, ...unsaved]
    if (wakeRef.current) {
      wakeRef.current = false
      next = wakeAll(next)
    }
    if (authResumeRef.current && loggedInRef.current) {
      authResumeRef.current = false
      next = resumeAuth(next)
    }
    publish(next)
  }, [publish])

  /** 写真の送信が終わったら、その場で写真の ID を残す（閉じても、上げ直さずに済む） */
  const recordMediaId = useCallback(
    async (photoId: string, mediaId: number) => {
      const item = itemsRef.current.find((i) => i.photos.some((p) => p.id === photoId))
      if (!item) return
      const photo = item.photos.find((p) => p.id === photoId)
      if (!photo || photo.mediaId) return
      await update({
        ...item,
        photos: item.photos.map((p) => (p.id === photoId ? { ...p, mediaId } : p)),
      })
    },
    [update],
  )

  /** 1件を送る。ログインが切れたら 'stop'（送信をやめる） */
  const sendOne = useCallback(
    async (item: OutboxItem): Promise<'next' | 'stop'> => {
      let cur = item
      const total = cur.photos.length
      sendingKeyRef.current = cur.key
      const report = (p: Omit<SendProgress, 'key' | 'total'>) =>
        setProgress({ key: cur.key, total, ...p })
      try {
        for (let i = 0; i < total; i++) {
          // 選んだ時点の送信が終わって写真の ID が残っていれば、それを使う（上げ直さない）
          cur = itemsRef.current.find((x) => x.key === cur.key) ?? cur
          const photo = cur.photos[i]
          if (photo.mediaId) continue
          report({ phase: 'photos', done: i, fraction: 0 })
          let mediaId: number | null = null
          const live = liveRef.current.get(photo.id)
          if (live) {
            try {
              mediaId = await live
            } catch (e) {
              // 写真そのものの誤り（大きすぎる・読めない）は、送り直しても同じなのでそのまま扱う。
              // ほか（通信の失敗・ログインし直す前のログイン切れ など）は、保存した写真から送り直す
              if (e instanceof ApiError && (e.status === 413 || e.status === 415)) throw e
            } finally {
              liveRef.current.delete(photo.id)
            }
          }
          if (!mediaId) {
            const blob = await loadPhoto(photo.id)
            // 端末に写真が残っていない（保存できなかった・消えた）: 直してもらう
            if (!blob) throw new ApiError(415, 'photo_missing')
            mediaId = await uploadPhoto(blob, (fraction) =>
              report({ phase: 'photos', done: i, fraction }),
            ).promise
          }
          const latest = itemsRef.current.find((x) => x.key === cur.key) ?? cur
          const got = mediaId
          cur = {
            ...latest,
            photos: latest.photos.map((p) => (p.id === photo.id ? { ...p, mediaId: got } : p)),
          }
          await update(cur)
        }

        report({ phase: 'post', done: total, fraction: 0 })
        // 送った直後に画面を離れても、投稿の送信は最後まで届ける（keepalive。応答を受け取れなかった分は、
        // 次に開いたときに同じ受付番号で送り直し、投稿済みとして片付く）
        const created = await call<Created>(
          '/api/quickpost/posts',
          {
            text: cur.text,
            title: cur.title,
            postType: cur.postType,
            images: cur.photos.map((p) => p.mediaId),
            key: cur.key,
            digest: cur.digest,
          },
          { keepalive: true },
        )
        if (created.duplicate && created.digest !== cur.digest) {
          // この受付番号では、すでに違う内容が投稿されていた（応答が届かないまま直して送った・別のタブが先に送った）
          await update({ ...cur, problem: 'conflict', code: undefined, nextAt: 0 })
          return 'next'
        }
        await remove(cur)
        if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current)
        setDone({ postId: created.id, until: Date.now() + DONE_MS })
        doneTimerRef.current = window.setTimeout(() => setDone(null), DONE_MS)
        return 'next'
      } catch (e) {
        const status = e instanceof ApiError ? e.status : 0
        const code = e instanceof ApiError ? e.code : undefined
        const latest = itemsRef.current.find((x) => x.key === cur.key) ?? cur
        // 写真が見つからない（古くなって片付けられた など）: 一度だけ、端末に残した写真から上げ直す
        if (status === 400 && code === 'invalid_images' && !latest.reuploaded) {
          await update({
            ...latest,
            photos: latest.photos.map((p) => ({ ...p, mediaId: null })),
            reuploaded: true,
            problem: null,
            nextAt: 0,
          })
          return 'next'
        }
        const problem = classify(status, code)
        clearDone()
        await update(markFailed(latest, problem, Date.now(), code))
        if (problem === 'auth') {
          onAuthLostRef.current()
          return 'stop'
        }
        return 'next'
      } finally {
        sendingKeyRef.current = null
      }
    },
    [clearDone, remove, update],
  )

  const schedule = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    const at = nextWakeAt(itemsRef.current, Date.now())
    if (at !== null) {
      timerRef.current = window.setTimeout(
        () => void runRef.current(),
        Math.max(0, at - Date.now()) + 50,
      )
    }
  }, [])

  /** 送れるものを順に送る（送っている途中に呼ばれたら、終わってからもう一度見る） */
  const run = useCallback(async () => {
    if (runningRef.current) {
      againRef.current = true
      return
    }
    if (!loggedInRef.current) return
    runningRef.current = true
    try {
      await withLock(async () => {
        await reload()
        for (;;) {
          if (!loggedInRef.current) break
          const next = nextToSend(itemsRef.current, Date.now())
          if (!next) break
          if ((await sendOne(next)) === 'stop') break
        }
      })
    } catch (e) {
      console.error('quickpost: outbox failed', e)
    } finally {
      runningRef.current = false
      setProgress(null)
      schedule()
      if (againRef.current) {
        againRef.current = false
        void runRef.current()
      }
    }
  }, [reload, schedule, sendOne])
  runRef.current = run

  // 開いたとき: 前回の送りかけを読み込む。ほかのタブの変更・電波・画面の切り替えを見張る
  useEffect(() => {
    let alive = true
    void (async () => {
      const stored = await loadItems()
      if (!alive) return
      publish(stored)
      if (stored.length) setResumed(true)
      void runRef.current()
    })()

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(CHANNEL)
      channel.onmessage = () => {
        if (!runningRef.current) void reload()
      }
    } catch {
      // 対応していなければ、画面に戻ったときに読み直す
    }
    channelRef.current = channel

    const wake = () => {
      wakeRef.current = true
      void runRef.current()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') wake()
    }
    window.addEventListener('online', wake)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      window.removeEventListener('online', wake)
      document.removeEventListener('visibilitychange', onVisible)
      channel?.close()
      channelRef.current = null
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current)
    }
  }, [publish, reload])

  // ログインした（し直した）とき: ログイン切れで止まっていた分から続きを送る
  useEffect(() => {
    if (!opts.loggedIn) return
    authResumeRef.current = true
    void runRef.current()
  }, [opts.loggedIn])

  /** 「投稿する」: 送信待ちに入れて、送り始める。端末に保存できたら true */
  const enqueue = useCallback(
    async (item: OutboxItem, photos: HandoffPhoto[]): Promise<boolean> => {
      for (const p of photos) {
        if (!p.upload) continue
        liveRef.current.set(p.id, p.upload)
        p.upload.then(
          (mediaId) => void recordMediaId(p.id, mediaId),
          () => undefined,
        )
      }
      // 保存し終えるまでは「保存できていない」扱いにする（その間に読み直しても消さない）
      unsavedRef.current.add(item.key)
      publish([...itemsRef.current.filter((i) => i.key !== item.key), item])
      const photosSaved = (await Promise.all(photos.map((p) => savePhoto(p.id, p.blob)))).every(
        Boolean,
      )
      // 保存を待つ間に写真の送信が終わっていれば、その ID も一緒に保存する
      const latest = itemsRef.current.find((i) => i.key === item.key) ?? item
      const saved = await saveItem(latest)
      if (saved && photosSaved) unsavedRef.current.delete(item.key)
      notifyOthers()
      void runRef.current()
      return saved && photosSaved
    },
    [notifyOthers, publish, recordMediaId],
  )

  /** 「もう一度」 */
  const retry = useCallback(
    async (key: string) => {
      const item = itemsRef.current.find((i) => i.key === key)
      if (!item) return
      await update(retryNow(item))
      void runRef.current()
    },
    [update],
  )

  /** 「別の投稿として送る」（受付番号が重なっていたとき。新しい受付番号で送る） */
  const resend = useCallback(
    async (key: string) => {
      const item = itemsRef.current.find((i) => i.key === key)
      if (!item) return
      await update(asNewPost(item, crypto.randomUUID()), key)
      void runRef.current()
    },
    [update],
  )

  /**
   * 「直す」: 送信待ちから外して、画面に戻す（写真も一緒に）。送っている最中のものは戻さない。
   * 受付番号が重なっていたものは、新しい受付番号で戻す（直して送ったら別の投稿になる）
   */
  const takeBack = useCallback(
    async (key: string) => {
      if (sendingKeyRef.current === key) return null
      const item = itemsRef.current.find((i) => i.key === key)
      if (!item) return null
      const photos: { id: string; blob: Blob; print: string; mediaId: number | null }[] = []
      for (const p of item.photos) {
        const blob = await loadPhoto(p.id)
        if (blob) photos.push({ id: p.id, blob, print: p.print, mediaId: p.mediaId })
      }
      await remove(item)
      clearDone()
      const fresh = item.problem === 'conflict' ? crypto.randomUUID() : item.key
      return { item: { ...item, key: fresh }, photos }
    },
    [clearDone, remove],
  )

  return { items, progress, resumed, done, enqueue, retry, resend, takeBack }
}
