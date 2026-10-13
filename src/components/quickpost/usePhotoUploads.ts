// src/components/quickpost/usePhotoUploads.ts
// 写真を選んだらすぐ送り始める（縮小 → 送信）。本文を書いている間に送り終え、「投稿する」のあとの待ちを短くする。
//   - 縮小は1枚ずつ（iOS は大きな写真を同時に描くとメモリーが足りなくなる）。送信も1枚ずつ
//   - 外した写真は送信を止め、送り終えていればサーバーから消す（投稿前の写真だけが消える）
//   - 「投稿する」で、縮小した写真と進行中の送信を送信待ち（useOutbox）に引き渡す
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, discardPhoto, uploadPhoto } from './api'
import { PhotoError, photoPrint, prepareForUpload } from './photo'
import type { HandoffPhoto } from './useOutbox'

/** 写真が使えない理由（直さないと投稿できない） */
export type PhotoProblem = 'unreadable' | 'too_large'

export type PhotoView = {
  id: string
  url: string
  noPreview?: boolean
  /** preparing: 縮小中 / uploading: 送信中 / done: 送り終えた / failed: 送れなかった（投稿のときにもう一度送る） */
  status: 'preparing' | 'uploading' | 'done' | 'failed'
  /** 送った割合（0〜1） */
  progress: number
  problem?: PhotoProblem
}

type Task = {
  id: string
  print: Promise<string>
  prepared: Promise<Blob>
  uploaded: Promise<number>
  mediaId: number | null
  removed: boolean
  abort: () => void
}

/** 送信待ちから画面に戻すときの写真 */
export type RestoredPhoto = { id: string; blob: Blob; print: string; mediaId: number | null }

/** 前の処理が終わってから次を始める（失敗しても列は止めない） */
function enqueue<T>(chain: { current: Promise<unknown> }, fn: () => Promise<T>): Promise<T> {
  const run = chain.current.catch(() => undefined).then(fn)
  chain.current = run.catch(() => undefined)
  return run
}

function problemOf(e: unknown): PhotoProblem | undefined {
  if (e instanceof PhotoError) return e.code
  if (e instanceof ApiError && e.status === 413) return 'too_large'
  if (e instanceof ApiError && e.status === 415) return 'unreadable'
  return undefined
}

export function usePhotoUploads(opts: { maxBytes: number; onAuthLost: () => void }) {
  const [photos, setPhotos] = useState<PhotoView[]>([])
  const photosRef = useRef<PhotoView[]>([])
  photosRef.current = photos
  const tasks = useRef(new Map<string, Task>())
  const prepareChain = useRef<Promise<unknown>>(Promise.resolve())
  const uploadChain = useRef<Promise<unknown>>(Promise.resolve())
  const urls = useRef(new Map<string, string>())
  const maxBytes = useRef(opts.maxBytes)
  maxBytes.current = opts.maxBytes
  const onAuthLost = useRef(opts.onAuthLost)
  onAuthLost.current = opts.onAuthLost

  const patch = useCallback((id: string, p: Partial<PhotoView>) => {
    setPhotos((prev) => prev.map((v) => (v.id === id ? { ...v, ...p } : v)))
  }, [])

  // 離れるときにプレビュー用の URL を手放す
  useEffect(() => {
    const map = urls.current
    return () => map.forEach((u) => URL.revokeObjectURL(u))
  }, [])

  /** 縮小した写真を送る（1枚ずつ）。外されていたら送らない */
  const startUpload = useCallback(
    (task: Task, blob: Blob): Promise<number> =>
      enqueue(uploadChain, async () => {
        if (task.removed) throw new ApiError(0, 'aborted')
        patch(task.id, { status: 'uploading', progress: 0 })
        const up = uploadPhoto(blob, (f) => patch(task.id, { progress: f }))
        task.abort = up.abort
        try {
          const mediaId = await up.promise
          task.mediaId = mediaId
          // 送っている間に外された写真は、送り終えた時点でサーバーから消す
          if (task.removed) discardPhoto(mediaId)
          else patch(task.id, { status: 'done', progress: 1 })
          return mediaId
        } catch (e) {
          if (!task.removed) {
            const problem = problemOf(e)
            patch(task.id, { status: 'failed', ...(problem ? { problem } : {}) })
            if (e instanceof ApiError && e.status === 401) onAuthLost.current()
          }
          throw e
        }
      }),
    [patch],
  )

  /** 写真を足す（選んだ順に縮小して送る） */
  const add = useCallback(
    (files: File[]) => {
      const views: PhotoView[] = []
      for (const file of files) {
        const id = crypto.randomUUID()
        const url = URL.createObjectURL(file)
        urls.current.set(id, url)
        views.push({ id, url, status: 'preparing', progress: 0 })
        const task: Task = {
          id,
          // 指紋は選んだ時点で取る（iOS では時間が経つと元の写真を読めなくなることがある）
          print: photoPrint(file),
          prepared: Promise.resolve(new Blob()),
          uploaded: Promise.resolve(0),
          mediaId: null,
          removed: false,
          abort: () => {},
        }
        task.prepared = enqueue(prepareChain, async () => {
          if (task.removed) throw new ApiError(0, 'aborted')
          return prepareForUpload(file, maxBytes.current)
        })
        task.prepared.catch((e) => {
          if (!task.removed) patch(id, { status: 'failed', problem: problemOf(e) ?? 'unreadable' })
        })
        task.uploaded = task.prepared.then((blob) => startUpload(task, blob))
        // 失敗は画面の印と「投稿する」で扱う（ここで投げっぱなしにしない）
        task.uploaded.catch(() => undefined)
        tasks.current.set(id, task)
      }
      if (views.length) setPhotos((prev) => [...prev, ...views])
    },
    [patch, startUpload],
  )

  /** 写真を外す（送信を止め、送り終えていればサーバーから消す） */
  const remove = useCallback((id: string) => {
    const task = tasks.current.get(id)
    if (task) {
      task.removed = true
      task.abort()
      if (task.mediaId) discardPhoto(task.mediaId)
      tasks.current.delete(id)
    }
    const url = urls.current.get(id)
    if (url) URL.revokeObjectURL(url)
    urls.current.delete(id)
    setPhotos((prev) => prev.filter((v) => v.id !== id))
  }, [])

  /** この端末で描けない写真（HEIC など）は、壊れた画像の代わりに目印を出す */
  const markNoPreview = useCallback((id: string) => patch(id, { noPreview: true }), [patch])

  /** 送れなかった写真を送り直す（電波が戻ったとき）。縮小できなかった写真は送れないのでそのまま */
  const retryFailed = useCallback(() => {
    for (const v of photosRef.current) {
      const task = tasks.current.get(v.id)
      if (!task || v.status !== 'failed' || v.problem) continue
      patch(v.id, { status: 'preparing', progress: 0 })
      task.uploaded = task.prepared.then((blob) => startUpload(task, blob))
      task.uploaded.catch(() => undefined)
    }
  }, [patch, startUpload])

  /**
   * 「投稿する」: 縮小した写真と指紋を揃えて、送信待ちに引き渡す（縮小が終わるまで待つ。たいてい終わっている）。
   * 引き渡した写真は画面から外すが、送信は止めない（送信待ちが続きを受け持つ）
   */
  const handoff = useCallback(async (): Promise<{
    photos: HandoffPhoto[]
    prints: string[]
    mediaIds: (number | null)[]
  }> => {
    const list = photos.map((v) => tasks.current.get(v.id)).filter((t): t is Task => Boolean(t))
    const ready = await Promise.all(
      list.map(async (t) => {
        try {
          return { t, blob: await t.prepared, print: await t.print }
        } catch (e) {
          // 待っている間に外した写真は渡さない（縮小も止まっている）
          if (t.removed) return null
          throw e
        }
      }),
    )
    const kept = ready.filter((r): r is NonNullable<typeof r> => r !== null && !r.t.removed)
    for (const t of list) tasks.current.delete(t.id)
    urls.current.forEach((u) => URL.revokeObjectURL(u))
    urls.current.clear()
    setPhotos([])
    return {
      photos: kept.map(({ t, blob }) => ({
        id: t.id,
        blob,
        ...(t.mediaId ? {} : { upload: t.uploaded }),
      })),
      prints: kept.map((r) => r.print),
      mediaIds: kept.map((r) => r.t.mediaId),
    }
  }, [photos])

  /** 送信待ちから戻した写真を並べる（送り終えた写真はそのまま使い、まだの写真は送り始める） */
  const restore = useCallback(
    (list: RestoredPhoto[]) => {
      const views: PhotoView[] = []
      for (const r of list) {
        const url = URL.createObjectURL(r.blob)
        urls.current.set(r.id, url)
        const task: Task = {
          id: r.id,
          print: Promise.resolve(r.print),
          prepared: Promise.resolve(r.blob),
          uploaded: Promise.resolve(r.mediaId ?? 0),
          mediaId: r.mediaId,
          removed: false,
          abort: () => {},
        }
        if (!r.mediaId) {
          task.uploaded = startUpload(task, r.blob)
          task.uploaded.catch(() => undefined)
        }
        tasks.current.set(r.id, task)
        views.push({
          id: r.id,
          url,
          status: r.mediaId ? 'done' : 'preparing',
          progress: r.mediaId ? 1 : 0,
        })
      }
      setPhotos((prev) => [...prev, ...views])
    },
    [startUpload],
  )

  return { photos, add, remove, markNoPreview, retryFailed, handoff, restore }
}
