// ───────────────────────────────────────────
// src/lib/payloadClient.ts
// ───────────────────────────────────────────
import payload from 'payload'
import payloadConfig from '../payload.config' // ← 2 つ上がルート

let initialized = false

export async function getPayloadClient() {
  if (!initialized) {
    await payload.init({
      /* ① Payload に渡す "設定そのもの" を指定 */
      config: payloadConfig,
      //local: true, // ローカルモードを有効化
      onInit: () => {
        console.log('Payload CMS initialized successfully')
      },
    })

    initialized = true
  }

  return payload
}
