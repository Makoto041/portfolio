// src/components/quickpost/useOutbox.ts
// さっと投稿（/post）の送信待ち。「投稿する」を押したら端末に保存し（src/components/quickpost/outboxDb.ts）、
// 押した順に1件ずつ送る（写真 → 投稿）。画面はすぐ次を書ける。決まりごとは src/lib/quickpost/outbox.ts。
//   - 送信待ちは1件ごとに ID を持つ（端末に保存するキー）。受付番号（下書きのキー）はサーバーで二重投稿を防ぐためのもので、
//     下書きを引き継いだ別のタブの送信待ちと同じこともある（内容が違えばサーバーが知らせ、帯で選んでもらう）
//   - 送れなかったら、通信の失敗などは時間を空けて自動で送り直す（電波が戻った・画面に戻ったときはすぐ）
//   - ログインが切れたら止め、ログインし直したら続きから送る
//   - 受付番号はそのまま使うので、送り直しても投稿は1件（サーバーの受付票）。受付票が消える前（25日）までしか自動では送らない
//   - iPhone の Safari は画面を閉じたあとに送り続ける仕組み（Background Sync）に対応していないため、
//     閉じている間は止まり、次に開いたときに続きから送る（投稿の送信だけは keepalive で、離れても届く）
//   - 複数のタブで開いていても、送るのは1つのタブだけ（Web Locks）。ほかのタブには変更を知らせる（BroadcastChannel）
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  asNewPost,
  byCreated,
  classify,
  isExpired,
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

/** 画面から送信待ちに渡す写真（縮小した写真と、選んだ時点で始めた送信・その送り具合） */
export type HandoffPhoto = {
  id: string
  blob: Blob
  upload?: Promise<number>
  /** 送り具合を受け取る（受け取るのをやめるときは返り値を呼ぶ） */
  onProgress?: (cb: (fraction: number) => void) => () => void
}

/** 「直す」の結果（ok: 画面に戻す / busy: いま送っている最中 / gone: もう送信待ちに無い） */
export type TakeBack =
  | {
      status: 'ok'
      item: OutboxItem
      photos: { id: string; blob: Blob; print: string; mediaId: number | null }[]
    }
  | { status: 'busy' }
  | { status: 'gone' }

type Live = Pick<HandoffPhoto, 'onProgress'> & { upload: Promise<number> }

type Created = { id: number; duplicate?: boolean; digest?: string | null }

const LOCK = 'mk_post_outbox'
const CHANNEL = 'mk_post_outbox'
/** 「投稿しました」を出しておく時間 */
const DONE_MS = 4000
/** ほかのタブから知らせが来てから、送信の順番に並ぶまで（知らせたタブが先にロックを取れるように） */
const FOLLOW_MS = 2000

/** 送信は1つのタブだけで行う（Web Locks が無い環境ではそのまま行う。同じ受付番号なので二重にはならない） */
async function withLock(fn: () => Promise<void>): Promise<void> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (locks?.request) {
    await locks.request(LOCK, () => fn())
    return
  }
  await fn()
}

/** 送信待ち（端末に保存して、押した順に送る投稿）と、帯に出す送信の様子を受け持つ */
export function useOutbox(opts: { loggedIn: boolean; onAuthLost: () => void }) {
  const [items, setItems] = useState<OutboxItem[]>([])
  const [progress, setProgress] = useState<SendProgress | null>(null)
  /** 開いたときに残っていた送信待ち（前回の続き）の ID */
  const [resumedIds, setResumedIds] = useState<ReadonlySet<string>>(() => new Set())
  const [done, setDone] = useState<{ postId: number } | null>(null)

  const itemsRef = useRef<OutboxItem[]>([])
  /** 選んだ時点で始めた写真の送信（写真の ID ごと。送信待ちが受け持つ） */
  const liveRef = useRef(new Map<string, Live>())
  /** 端末に保存できなかった送信待ちの ID（読み直したときに消さない） */
  const unsavedRef = useRef(new Set<string>())
  const sendingIdRef = useRef<string | null>(null)
  const runningRef = useRef(false)
  /** このタブが送信のロックを持っている間 */
  const holdingRef = useRef(false)
  const againRef = useRef(false)
  const wakeRef = useRef(false)
  const authResumeRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const doneTimerRef = useRef<number | null>(null)
  /** ほかのタブの知らせを受けて、送信の順番に並ぶ予約 */
  const followRef = useRef<number | null>(null)
  /** 入力欄を使っている間は「投稿しました」を下げない（帯が消えて、書いている入力欄がずれないように） */
  const holdDoneRef = useRef(false)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const loggedInRef = useRef(opts.loggedIn)
  loggedInRef.current = opts.loggedIn
  const onAuthLostRef = useRef(opts.onAuthLost)
  onAuthLostRef.current = opts.onAuthLost
  const runRef = useRef<() => Promise<void>>(async () => {})

  /** 一覧を画面と手元の写しに反映する（押した順に並べる） */
  const publish = useCallback((next: OutboxItem[]) => {
    itemsRef.current = [...next].sort(byCreated)
    setItems(itemsRef.current)
  }, [])

  /** 「投稿しました」を下げる（あとで送れなかった・画面に戻したときに、前の「投稿しました」を出し直さない） */
  const clearDone = useCallback(() => {
    if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current)
    doneTimerRef.current = null
    setDone(null)
  }, [])

  /** 「投稿しました」を出す。DONE_MS たったら下げる（入力欄を使っている間は、離れるまで出しておく） */
  const showDone = useCallback((postId: number) => {
    if (doneTimerRef.current !== null) window.clearTimeout(doneTimerRef.current)
    setDone({ postId })
    doneTimerRef.current = window.setTimeout(() => {
      doneTimerRef.current = null
      if (!holdDoneRef.current) setDone(null)
    }, DONE_MS)
  }, [])

  /** 入力欄を使い始めた・離れた。離れたとき、出しておく時間を過ぎた「投稿しました」を下げる */
  const holdDone = useCallback((hold: boolean) => {
    holdDoneRef.current = hold
    if (!hold && doneTimerRef.current === null) setDone(null)
  }, [])

  /** ほかのタブに、送信待ちが変わったことを知らせる */
  const notifyOthers = useCallback(() => {
    try {
      channelRef.current?.postMessage('changed')
    } catch {
      // 知らせられなくても、ほかのタブは画面に戻ったときに読み直す
    }
  }, [])

  /** 1件を書き換えて保存する（送れた・画面に戻したあとに届いた書き換えで、消したものを保存し直さない） */
  const update = useCallback(
    async (next: OutboxItem) => {
      if (!itemsRef.current.some((i) => i.id === next.id)) return
      publish(itemsRef.current.map((i) => (i.id === next.id ? next : i)))
      const saved = await saveItem(next)
      if (saved) unsavedRef.current.delete(next.id)
      else unsavedRef.current.add(next.id)
      notifyOthers()
    },
    [notifyOthers, publish],
  )

  /** 送信待ちから外し、端末の保存（写真も）から消す */
  const remove = useCallback(
    async (item: OutboxItem) => {
      publish(itemsRef.current.filter((i) => i.id !== item.id))
      unsavedRef.current.delete(item.id)
      for (const p of item.photos) liveRef.current.delete(p.id)
      await deleteItem(item)
      notifyOthers()
    },
    [notifyOthers, publish],
  )

  /**
   * 保存した中身から読み直す（ほかのタブが送った・直した分を反映。保存できなかった分は残す）。
   * 読み出しに失敗したときは、いまの一覧のまま（読めなかった分を消したことにしない）
   */
  const reload = useCallback(async () => {
    const stored = await loadItems()
    if (stored === null) return
    const ids = new Set(stored.map((i) => i.id))
    const unsaved = itemsRef.current.filter((i) => unsavedRef.current.has(i.id) && !ids.has(i.id))
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
      sendingIdRef.current = cur.id
      const report = (p: Omit<SendProgress, 'id' | 'total'>) =>
        setProgress({ id: cur.id, total, ...p })
      try {
        for (let i = 0; i < total; i++) {
          // 選んだ時点の送信が終わって写真の ID が残っていれば、それを使う（上げ直さない）
          cur = itemsRef.current.find((x) => x.id === cur.id) ?? cur
          const photo = cur.photos[i]
          if (photo.mediaId) continue
          report({ phase: 'photos', done: i, fraction: 0 })
          let mediaId: number | null = null
          const live = liveRef.current.get(photo.id)
          if (live) {
            // 選んだ時点で始めた送信の送り具合を、帯に出す
            const stop = live.onProgress?.((fraction) =>
              report({ phase: 'photos', done: i, fraction }),
            )
            try {
              mediaId = await live.upload
            } catch (e) {
              // 写真そのものの誤り（大きすぎる・読めない）は、送り直しても同じなのでそのまま扱う。
              // ほか（通信の失敗・ログインし直す前のログイン切れ など）は、保存した写真から送り直す
              if (e instanceof ApiError && (e.status === 413 || e.status === 415)) throw e
            } finally {
              stop?.()
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
          const latest = itemsRef.current.find((x) => x.id === cur.id) ?? cur
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
          clearDone()
          await update({ ...cur, problem: 'conflict', code: undefined, nextAt: 0 })
          return 'next'
        }
        await remove(cur)
        showDone(created.id)
        return 'next'
      } catch (e) {
        const status = e instanceof ApiError ? e.status : 0
        const code = e instanceof ApiError ? e.code : undefined
        const latest = itemsRef.current.find((x) => x.id === cur.id) ?? cur
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
        sendingIdRef.current = null
      }
    },
    [clearDone, remove, showDone, update],
  )

  /** 次に自動で送り直す時刻に、送信を起こす予約をする */
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
        try {
          await reload()
          // 読み直したあとから「このタブが送っている」とする（読み直しの間の「直す」は、ロックが空かないので断る）
          holdingRef.current = true
          for (;;) {
            if (!loggedInRef.current) break
            const now = Date.now()
            const next = nextToSend(itemsRef.current, now)
            if (!next) break
            // 受付票が消える前に送れなかったものは自動では送らない（二重投稿を防げないため。確かめて「直す」から）
            if (isExpired(next, now)) {
              await update(markFailed(next, 'expired', now))
              continue
            }
            if ((await sendOne(next)) === 'stop') break
          }
        } finally {
          holdingRef.current = false
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
  }, [reload, schedule, sendOne, update])
  runRef.current = run

  // 開いたとき: 前回の送りかけを読み込む。ほかのタブの変更・電波・画面の切り替えを見張る
  useEffect(() => {
    let alive = true
    void (async () => {
      const stored = await loadItems()
      if (!alive) return
      if (stored) {
        publish(stored)
        if (stored.length) setResumedIds(new Set(stored.map((i) => i.id)))
      }
      void runRef.current()
    })()

    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(CHANNEL)
      channel.onmessage = () => {
        // ほかのタブの変更を画面に反映する（このタブが送っている最中は、送り終えてから読み直す）
        if (!holdingRef.current) void reload()
        // 送っているタブが途中で閉じられても続きを送れるように、少し待ってから送信の順番に並ぶ
        // （送っているタブがあれば、そのタブが送り終えてロックを手放してから。送るものが無ければすぐ終わる）
        if (followRef.current === null) {
          followRef.current = window.setTimeout(() => {
            followRef.current = null
            void runRef.current()
          }, FOLLOW_MS)
        }
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
      if (followRef.current !== null) window.clearTimeout(followRef.current)
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
        liveRef.current.set(p.id, { upload: p.upload, onProgress: p.onProgress })
        p.upload.then(
          (mediaId) => void recordMediaId(p.id, mediaId),
          () => undefined,
        )
      }
      // 保存し終えるまでは「保存できていない」扱いにする（その間に読み直しても消さない）
      unsavedRef.current.add(item.id)
      publish([...itemsRef.current.filter((i) => i.id !== item.id), item])
      const photosSaved = (await Promise.all(photos.map((p) => savePhoto(p.id, p.blob)))).every(
        Boolean,
      )
      // 保存を待つ間に送り終えていたら（電波が戻った などで先に送った）、保存し直さない
      const latest = itemsRef.current.find((i) => i.id === item.id)
      if (!latest) {
        // 送り終えたときに消した写真を、遅れて保存していることがあるので、もう一度消す（何度消しても同じ）
        await deleteItem(item)
        return true
      }
      // 保存を待つ間に写真の送信が終わっていれば、その ID も一緒に保存する
      const saved = await saveItem(latest)
      if (saved && photosSaved) unsavedRef.current.delete(item.id)
      notifyOthers()
      void runRef.current()
      return saved && photosSaved
    },
    [notifyOthers, publish, recordMediaId],
  )

  /** 「もう一度」 */
  const retry = useCallback(
    async (id: string) => {
      const item = itemsRef.current.find((i) => i.id === id)
      if (!item) return
      await update(retryNow(item))
      void runRef.current()
    },
    [update],
  )

  /** 「別の投稿として送る」（受付番号が重なっていたとき。新しい受付番号で送る） */
  const resend = useCallback(
    async (id: string) => {
      const item = itemsRef.current.find((i) => i.id === id)
      if (!item) return
      await update(asNewPost(item, crypto.randomUUID()))
      void runRef.current()
    },
    [update],
  )

  /**
   * 「直す」: 送信待ちから外して、画面に戻す（写真も一緒に）。送っている最中のものは戻さない
   * （ほかのタブが送っている最中も戻さない。そのタブが送り終えたあとに保存し直してしまうため）。
   * 受付番号が重なっていたものは、新しい受付番号で戻す（直して送ったら別の投稿になる）
   */
  const takeBack = useCallback(
    async (id: string): Promise<TakeBack> => {
      if (sendingIdRef.current === id) return { status: 'busy' }
      const work = async (): Promise<TakeBack> => {
        const item = itemsRef.current.find((i) => i.id === id)
        if (!item) return { status: 'gone' }
        // 先に送信待ちから外す（写真を読み出している間に送り始めないように）
        publish(itemsRef.current.filter((i) => i.id !== id))
        const photos: { id: string; blob: Blob; print: string; mediaId: number | null }[] = []
        for (const p of item.photos) {
          const blob = await loadPhoto(p.id)
          if (blob) photos.push({ id: p.id, blob, print: p.print, mediaId: p.mediaId })
        }
        await remove(item)
        clearDone()
        const key = item.problem === 'conflict' ? crypto.randomUUID() : item.key
        return { status: 'ok', item: { ...item, key }, photos }
      }
      // このタブが送っている最中なら、送っていない投稿はそのまま戻せる
      if (holdingRef.current) return work()
      const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
      if (!locks?.request) return work()
      return locks.request(LOCK, { ifAvailable: true }, async (lock): Promise<TakeBack> => {
        if (!lock) return { status: 'busy' }
        // ほかのタブが送った・直した分を反映してから
        await reload()
        return work()
      })
    },
    [clearDone, publish, reload, remove],
  )

  return {
    items,
    progress,
    resumedIds,
    done,
    enqueue,
    retry,
    resend,
    takeBack,
    holdDone,
  }
}
