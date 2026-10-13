// src/components/quickpost/api.ts
// さっと投稿（/post）の画面から API を呼ぶ。失敗は ApiError（status 0 は通信の失敗）にそろえる。
// 写真は進み具合を出すため XMLHttpRequest で送る（fetch では送った量が分からない）。
// どちらも応答が来ないまま止まったら通信の失敗として扱う（送信待ちが止まったままにならないように）。

/** 応答を待つ上限（サーバーの処理は長くて 30 秒） */
const CALL_TIMEOUT_MS = 45_000
/** 写真の送信が進まなくなってから、通信の失敗とみなすまで（送り終えてからサーバーが写真を作り直す間も含む） */
const UPLOAD_STALL_MS = 60_000

export class ApiError extends Error {
  constructor(
    public status: number,
    public code?: string,
  ) {
    super(code ?? String(status))
    this.name = 'ApiError'
  }
}

/**
 * API を呼ぶ（body があれば JSON で POST、無ければ GET）。失敗は ApiError（応答が無い・止まったら status 0）。
 * keepalive を付けると、画面を離れても送信を最後まで届ける
 */
export async function call<T>(
  path: string,
  body?: unknown,
  opts: { keepalive?: boolean } = {},
): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS)
  try {
    let res: Response
    try {
      res = await fetch(path, {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
        cache: 'no-store',
        signal: ctrl.signal,
        ...(opts.keepalive ? { keepalive: true } : {}),
      })
    } catch {
      throw new ApiError(0, 'network')
    }
    const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null
    if (!res.ok) throw new ApiError(res.status, data?.error)
    return data as T
  } finally {
    clearTimeout(timer)
  }
}

export type Upload = { promise: Promise<number>; abort: () => void }

/** 写真1枚を送る。送れたら写真の ID。onProgress には送った割合（0〜1）が届く */
export function uploadPhoto(blob: Blob, onProgress: (fraction: number) => void): Upload {
  const xhr = new XMLHttpRequest()
  let stalled = false
  let watchdog: ReturnType<typeof setTimeout> | undefined
  // 進むたびに見張りをかけ直す（遅い回線でも進んでいる間は待つ）
  const watch = () => {
    clearTimeout(watchdog)
    watchdog = setTimeout(() => {
      stalled = true
      xhr.abort()
    }, UPLOAD_STALL_MS)
  }
  const promise = new Promise<number>((resolve, reject) => {
    xhr.open('POST', '/api/quickpost/photo')
    xhr.setRequestHeader('content-type', blob.type || 'image/jpeg')
    xhr.upload.onprogress = (e) => {
      watch()
      if (e.lengthComputable && e.total > 0) onProgress(Math.min(1, e.loaded / e.total))
    }
    xhr.upload.onload = watch
    xhr.onloadend = () => clearTimeout(watchdog)
    xhr.onload = () => {
      let data: { id?: unknown; error?: string } | null = null
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        // 本文が JSON でない（途中の機器のエラーページなど）
      }
      if (xhr.status === 200 && typeof data?.id === 'number') resolve(data.id)
      else reject(new ApiError(xhr.status, data?.error))
    }
    xhr.onerror = () => reject(new ApiError(0, 'network'))
    xhr.ontimeout = () => reject(new ApiError(0, 'network'))
    xhr.onabort = () => reject(new ApiError(0, stalled ? 'network' : 'aborted'))
    watch()
    xhr.send(blob)
  })
  return { promise, abort: () => xhr.abort() }
}

/** 画面で外した写真をサーバーから消す（投稿前の写真だけ。失敗しても、古くなればサーバーが片付ける） */
export function discardPhoto(mediaId: number): void {
  void fetch(`/api/quickpost/photo?id=${mediaId}`, {
    method: 'DELETE',
    credentials: 'same-origin',
    cache: 'no-store',
    // 外した直後に画面を閉じても届くように
    keepalive: true,
  }).catch(() => {})
}
