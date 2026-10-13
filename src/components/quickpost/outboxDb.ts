// src/components/quickpost/outboxDb.ts
// さっと投稿（/post）の送信待ちを端末に保存する（IndexedDB）。途中で画面を閉じても、次に開いたときに続きから送るため。
//   - outbox: 送信待ちの投稿（送信待ちの中での ID がキー。受付番号は別のタブの送信待ちと同じこともあるのでキーにしない。
//     中身の形は src/lib/quickpost/outbox.ts で確かめて読む）
//   - photos: 送信待ちの写真（縮小した JPEG。写真の ID がキー）。サーバーで写真が片付けられていても上げ直せるよう、
//     投稿できるまで残す。Blob をそのまま入れられない環境があるので、ArrayBuffer と形式で持つ
// IndexedDB が使えない（プライベートモードなど）ときはメモリーだけで続ける（閉じると消える）。
import { parseOutboxItem, type OutboxItem } from '@/lib/quickpost/outbox'

const DB_NAME = 'mk_post'
/** 版 2: 送信待ちのキーを受付番号から送信待ちの中での ID に変えた（版 1 は公開前の試しだけ） */
const DB_VERSION = 2
const ITEMS = 'outbox'
const PHOTOS = 'photos'

type StoredPhoto = { type: string; data: ArrayBuffer }

let opening: Promise<IDBDatabase | null> | null = null
const memItems = new Map<string, OutboxItem>()
const memPhotos = new Map<string, Blob>()

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error ?? new Error('aborted'))
    tx.onerror = () => reject(tx.error ?? new Error('failed'))
  })
}

function result<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('failed'))
  })
}

function openDb(): Promise<IDBDatabase | null> {
  if (!opening) {
    opening = new Promise((resolve) => {
      let gaveUp = false
      // 開けなかったときは、次に使うときにもう一度開いてみる（一度の失敗で、ずっとメモリーだけにしない）
      const failed = () => {
        gaveUp = true
        opening = null
        resolve(null)
      }
      try {
        if (typeof indexedDB === 'undefined') return resolve(null)
        const req = indexedDB.open(DB_NAME, DB_VERSION)
        req.onupgradeneeded = () => {
          const db = req.result
          const tx = req.transaction
          // 版 1（受付番号がキー）の送信待ちは作り直す
          if (db.objectStoreNames.contains(ITEMS) && tx?.objectStore(ITEMS).keyPath !== 'id') {
            db.deleteObjectStore(ITEMS)
          }
          if (!db.objectStoreNames.contains(ITEMS)) db.createObjectStore(ITEMS, { keyPath: 'id' })
          if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS)
        }
        req.onsuccess = () => {
          const db = req.result
          // 待ちきれずにあきらめたあとで開けた接続は使わない（握ったままにしない）
          if (gaveUp) return db.close()
          // ほかのタブが新しい版で開こうとしたら閉じる（古い版のまま握り続けて邪魔をしない）。次に使うときに開き直す
          db.onversionchange = () => {
            db.close()
            opening = null
          }
          // ブラウザに接続を切られたとき（iOS で長く裏にあったあと など）も、次に使うときに開き直す
          db.onclose = () => {
            opening = null
          }
          resolve(db)
        }
        req.onerror = failed
        req.onblocked = failed
      } catch {
        failed()
      }
    })
  }
  return opening
}

/**
 * 保存してある送信待ち（壊れたものは捨てる）。IndexedDB が使えない環境ではメモリーの分。
 * 読み出しに失敗したときは null（呼び出し側はいまの一覧をそのまま使う。読めなかった分を消したことにしない）
 */
export async function loadItems(): Promise<OutboxItem[] | null> {
  const db = await openDb()
  if (!db) return [...memItems.values()]
  try {
    const tx = db.transaction(ITEMS, 'readonly')
    const rows = await result(tx.objectStore(ITEMS).getAll())
    return rows.map(parseOutboxItem).filter((i): i is OutboxItem => i !== null)
  } catch {
    return null
  }
}

/** 送信待ちを保存する。保存できたら true */
export async function saveItem(item: OutboxItem): Promise<boolean> {
  memItems.set(item.id, item)
  const db = await openDb()
  if (!db) return false
  try {
    const tx = db.transaction(ITEMS, 'readwrite')
    tx.objectStore(ITEMS).put(item)
    await done(tx)
    return true
  } catch {
    return false
  }
}

/** 送信待ちを消す（送れた・画面に戻した）。写真も消す */
export async function deleteItem(item: Pick<OutboxItem, 'id' | 'photos'>): Promise<void> {
  memItems.delete(item.id)
  for (const p of item.photos) memPhotos.delete(p.id)
  const db = await openDb()
  if (!db) return
  try {
    const tx = db.transaction([ITEMS, PHOTOS], 'readwrite')
    tx.objectStore(ITEMS).delete(item.id)
    for (const p of item.photos) tx.objectStore(PHOTOS).delete(p.id)
    await done(tx)
  } catch {
    // 消せなくても、次に開いたときに送ろうとして「すでに投稿済み」で片付く
  }
}

/** 写真を保存する。保存できたら true */
export async function savePhoto(id: string, blob: Blob): Promise<boolean> {
  memPhotos.set(id, blob)
  const db = await openDb()
  if (!db) return false
  try {
    const value: StoredPhoto = { type: blob.type || 'image/jpeg', data: await blob.arrayBuffer() }
    const tx = db.transaction(PHOTOS, 'readwrite')
    tx.objectStore(PHOTOS).put(value, id)
    await done(tx)
    return true
  } catch {
    return false
  }
}

/** 保存した写真（無ければ null） */
export async function loadPhoto(id: string): Promise<Blob | null> {
  const mem = memPhotos.get(id)
  if (mem) return mem
  const db = await openDb()
  if (!db) return null
  try {
    const tx = db.transaction(PHOTOS, 'readonly')
    const v = (await result(tx.objectStore(PHOTOS).get(id))) as StoredPhoto | undefined
    if (!v || !(v.data instanceof ArrayBuffer)) return null
    return new Blob([v.data], { type: v.type || 'image/jpeg' })
  } catch {
    return null
  }
}
