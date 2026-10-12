// ───────────────────────────────────────────
// src/lib/payloadClient.ts
// ───────────────────────────────────────────
import payload from 'payload'
import payloadConfig from '../payload.config' // ← 2 つ上がルート

// 初期化は1回だけ。同時に呼ばれても同じ初期化を待たせる（起動直後に同時アクセスが来ても、
// それぞれが init して DB 接続を取り合わないように）。失敗したら次の呼び出しでやり直す
let ready: Promise<typeof payload> | null = null

export function getPayloadClient(): Promise<typeof payload> {
  if (!ready) {
    ready = payload
      .init({
        /* ① Payload に渡す "設定そのもの" を指定 */
        config: payloadConfig,
        //local: true, // ローカルモードを有効化
        onInit: () => {
          console.log('Payload CMS initialized successfully')
        },
      })
      .then(() => payload)
      .catch((e) => {
        ready = null
        throw e
      })
  }
  return ready
}
