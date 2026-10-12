// src/lib/quickpost/webauthn.ts
// 端末から届いたパスキーの応答（JSON）の形を確かめ、知っている項目だけで組み直す（純粋な関数。単体テストあり）。
// 署名などの中身の検証は @simplewebauthn/server が行う。ここでは DB を引く前の門前払いをする。
// 検証に失敗した理由を、ログ用の決まった名前にする関数（describeWebAuthnError）もここに置く。
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from '@simplewebauthn/server'

const B64URL = /^[A-Za-z0-9_-]+$/

const isB64 = (v: unknown, max = 16384): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max && B64URL.test(v)

const TRANSPORTS: readonly AuthenticatorTransportFuture[] = [
  'ble',
  'cable',
  'hybrid',
  'internal',
  'nfc',
  'smart-card',
  'usb',
]

/** DB に保存した「usb,internal」のような文字列を、知っている値だけの配列に戻す */
export function parseTransports(value: unknown): AuthenticatorTransportFuture[] | undefined {
  const list = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []
  const known = list.filter((t): t is AuthenticatorTransportFuture =>
    (TRANSPORTS as readonly unknown[]).includes(t),
  )
  return known.length ? [...new Set(known)] : undefined
}

const asRecord = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

const attachment = (v: unknown) => (v === 'platform' || v === 'cross-platform' ? v : undefined)

export function asAuthenticationResponse(body: unknown): AuthenticationResponseJSON | null {
  const b = asRecord(body)
  const r = asRecord(b?.response)
  if (!b || !r) return null
  if (!isB64(b.id, 1024) || !isB64(b.rawId, 1024) || b.type !== 'public-key') return null
  if (!isB64(r.clientDataJSON) || !isB64(r.authenticatorData) || !isB64(r.signature)) return null
  if (r.userHandle !== undefined && r.userHandle !== null && !isB64(r.userHandle, 1024)) return null
  return {
    id: b.id,
    rawId: b.rawId,
    type: 'public-key',
    response: {
      clientDataJSON: r.clientDataJSON,
      authenticatorData: r.authenticatorData,
      signature: r.signature,
      ...(typeof r.userHandle === 'string' ? { userHandle: r.userHandle } : {}),
    },
    clientExtensionResults: {},
    authenticatorAttachment: attachment(b.authenticatorAttachment),
  }
}

export function asRegistrationResponse(body: unknown): RegistrationResponseJSON | null {
  const b = asRecord(body)
  const r = asRecord(b?.response)
  if (!b || !r) return null
  if (!isB64(b.id, 1024) || !isB64(b.rawId, 1024) || b.type !== 'public-key') return null
  if (!isB64(r.clientDataJSON) || !isB64(r.attestationObject, 65536)) return null
  return {
    id: b.id,
    rawId: b.rawId,
    type: 'public-key',
    response: {
      clientDataJSON: r.clientDataJSON,
      attestationObject: r.attestationObject,
      transports: parseTransports(r.transports),
    },
    clientExtensionResults: {},
    authenticatorAttachment: attachment(b.authenticatorAttachment),
  }
}

/**
 * パスキーの検証に失敗した理由（@simplewebauthn/server の失敗の文の書き出し）と、ログに出す名前。
 * 失敗の文には確認値（challenge）や端末から届いた値がそのまま入る（引用符で囲まないものもある）ので、
 * 文そのものは出さない。書き出しはライブラリが書く決まった部分で、端末から届いた値はその後ろにしか来ない
 */
const WEBAUTHN_FAILURES: ReadonlyArray<readonly [RegExp, string]> = [
  [/^Unexpected (authentication|registration) response challenge /, 'challenge'],
  [/^Custom challenge verifier /, 'challenge'],
  [/^Unexpected (authentication|registration) response origin /, 'origin'],
  [/^Unexpected RP ID hash/, 'rp-id'],
  [/^Unexpected (authentication|registration) response type/, 'type'],
  [/^User (not present|presence was required)/, 'user-presence'],
  [/^User verification (was )?required/, 'user-verification'],
  [/^Response counter value /, 'counter'],
  [/^Unexpected public key alg /, 'algorithm'],
]

/** パスキーの検証に失敗した理由を、ログ用の決まった名前にする（知らない失敗は 'other'） */
export function describeWebAuthnError(e: unknown): string {
  const message = e instanceof Error ? e.message : ''
  return WEBAUTHN_FAILURES.find(([pattern]) => pattern.test(message))?.[1] ?? 'other'
}
