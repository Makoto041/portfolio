// src/lib/netguard.ts
// サーバーから外部の URL を取りに行くとき（リンクのプレビュー）に、内部ネットワークへ接続させない関所。
// - http(s) の既定ポートだけ。ユーザー情報つき URL・localhost などの内部名は断る
// - 接続先は DNS の解決結果をすべて検査し、実際の接続にもその検査済みのアドレスを使う
//   （検査のあとで DNS を差し替えて内部へ向ける手口を防ぐ）
// - リダイレクトは1回ずつ同じ検査をやり直す（最大3回）
// - 受け取る本文の大きさ・時間に上限を設け、HTML 以外は本文を読まない
import dns from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import net from 'node:net'
import zlib from 'node:zlib'

export class BlockedUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BlockedUrlError'
  }
}

// ── IP アドレスの判定 ──

/** 公開インターネット向けでない IPv4 の範囲（RFC 6890 ほか） */
const V4_BLOCKED: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8], // この網
  ['10.0.0.0', 8], // プライベート
  ['100.64.0.0', 10], // CGNAT（tailnet もここ）
  ['127.0.0.0', 8], // ループバック
  ['169.254.0.0', 16], // リンクローカル（クラウドのメタデータ）
  ['172.16.0.0', 12], // プライベート
  ['192.0.0.0', 24], // IETF プロトコル割当
  ['192.0.2.0', 24], // 文書用
  ['192.88.99.0', 24], // 6to4 リレー（廃止）
  ['192.168.0.0', 16], // プライベート
  ['198.18.0.0', 15], // ベンチマーク
  ['198.51.100.0', 24], // 文書用
  ['203.0.113.0', 24], // 文書用
  ['224.0.0.0', 4], // マルチキャスト
  ['240.0.0.0', 4], // 予約・ブロードキャスト
]

function v4ToInt(address: string): number {
  return address.split('.').reduce((acc, part) => ((acc << 8) | Number(part)) >>> 0, 0)
}

function isPublicV4(address: string): boolean {
  const ip = v4ToInt(address)
  return !V4_BLOCKED.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
    return (ip & mask) >>> 0 === (v4ToInt(base) & mask) >>> 0
  })
}

/** IPv6 を 16bit × 8 の数に展開する（末尾の IPv4 表記・ゾーン ID にも対応）。不正なら null */
function expandV6(input: string): number[] | null {
  let a = input.toLowerCase().split('%')[0]
  const dotted = a.match(/^(.*:)(\d+\.\d+\.\d+\.\d+)$/)
  if (dotted) {
    if (!net.isIPv4(dotted[2])) return null
    const [p, q, r, s] = dotted[2].split('.').map(Number)
    a = `${dotted[1]}${((p << 8) | q).toString(16)}:${((r << 8) | s).toString(16)}`
  }
  const halves = a.split('::')
  if (halves.length > 2) return null
  const parts = (s: string) => (s ? s.split(':') : [])
  const head = parts(halves[0])
  const tail = halves.length === 2 ? parts(halves[1]) : []
  const missing = 8 - head.length - tail.length
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...tail]
  const out = groups.map((h) => (/^[0-9a-f]{1,4}$/.test(h) ? parseInt(h, 16) : NaN))
  return out.length === 8 && !out.some(Number.isNaN) ? out : null
}

const v4FromGroups = (hi: number, lo: number) => `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`
const allZero = (g: number[]) => g.every((x) => x === 0)

function isPublicV6(address: string): boolean {
  const g = expandV6(address)
  if (!g) return false
  // :: と ::1
  if (allZero(g)) return false
  if (allZero(g.slice(0, 7)) && g[7] === 1) return false
  // IPv4 射影（::ffff:a.b.c.d）・IPv4 互換（::a.b.c.d）は中の IPv4 で判定
  if (allZero(g.slice(0, 5)) && (g[5] === 0xffff || g[5] === 0))
    return isPublicV4(v4FromGroups(g[6], g[7]))
  // NAT64（64:ff9b::/96）も中の IPv4 で判定。ローカル用 NAT64（64:ff9b:1::/48）は不可
  if (g[0] === 0x64 && g[1] === 0xff9b) {
    if (allZero(g.slice(2, 6))) return isPublicV4(v4FromGroups(g[6], g[7]))
    return false
  }
  // 6to4（2002::/16）は埋め込まれた IPv4 で判定
  if (g[0] === 0x2002) return isPublicV4(v4FromGroups(g[1], g[2]))
  // Teredo・ベンチマークなどの IETF 割当（2001::/23）と文書用（2001:db8::/32）は不可
  if (g[0] === 0x2001 && (g[1] < 0x0200 || g[1] === 0x0db8)) return false
  // グローバルユニキャスト（2000::/3）だけを公開とみなす（ユニークローカル・リンクローカル・マルチキャストは外れる）
  return (g[0] & 0xe000) === 0x2000
}

/** 公開インターネット上のアドレスか（ループバック・プライベート・リンクローカル・CGNAT・予約済みは false） */
export function isPublicIp(address: string): boolean {
  const version = net.isIP(address)
  if (version === 4) return isPublicV4(address)
  if (version === 6) return isPublicV6(address)
  return false
}

// ── URL の検査 ──

export type LookupAll = (hostname: string) => Promise<Array<{ address: string; family: number }>>

const lookupAll: LookupAll = (hostname) =>
  dns.promises.lookup(hostname, { all: true, verbatim: true })

/** 内部向けとみなすホスト名（DNS を引く前に断る） */
function isInternalHostname(host: string): boolean {
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.home.arpa') ||
    !host.includes('.')
  )
}

export type CheckedTarget = { url: URL; address: string; family: number }

/** 取りに行ってよい URL か検査し、接続に使うアドレスを返す。だめなら BlockedUrlError */
export async function checkPublicHttpUrl(
  raw: string,
  lookup: LookupAll = lookupAll,
): Promise<CheckedTarget> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new BlockedUrlError('invalid url')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new BlockedUrlError('scheme')
  if (url.username || url.password) throw new BlockedUrlError('credentials')
  // URL は既定ポートを '' に正規化するので、ポート指定があれば既定以外
  if (url.port) throw new BlockedUrlError('port')

  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase()
  const literal = net.isIP(host)
  if (literal) {
    if (!isPublicIp(host)) throw new BlockedUrlError('address')
    return { url, address: host, family: literal }
  }
  if (isInternalHostname(host)) throw new BlockedUrlError('hostname')

  let addresses: Array<{ address: string; family: number }>
  try {
    addresses = await lookup(host)
  } catch {
    throw new BlockedUrlError('dns')
  }
  // 1つでも内部向けが混じっていれば断る（どのアドレスに繋がるかを相手に選ばせない）
  if (addresses.length === 0 || addresses.some((a) => !isPublicIp(a.address))) {
    throw new BlockedUrlError('address')
  }
  return { url, address: addresses[0].address, family: addresses[0].family }
}

// ── 取得 ──

export type FetchedText = { url: string; status: number; contentType: string; body: string }

type FetchOptions = {
  userAgent: string
  timeoutMs?: number
  maxBytes?: number
  maxRedirects?: number
  lookup?: LookupAll
}

const REDIRECTS = new Set([301, 302, 303, 307, 308])

/** 公開 URL から HTML を取得する（内部ネットワークへは接続しない）。HTML 以外は body を空で返す */
export async function fetchPublicHtml(raw: string, opts: FetchOptions): Promise<FetchedText> {
  const { timeoutMs = 5000, maxBytes = 512 * 1024, maxRedirects = 3, lookup = lookupAll } = opts
  const deadline = Date.now() + timeoutMs
  let current = raw
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const target = await checkPublicHttpUrl(current, lookup)
    const res = await requestOnce(target, { userAgent: opts.userAgent, deadline, maxBytes })
    if (REDIRECTS.has(res.status) && res.location) {
      current = new URL(res.location, target.url).toString()
      continue
    }
    return {
      url: target.url.toString(),
      status: res.status,
      contentType: res.contentType,
      body: res.body,
    }
  }
  throw new BlockedUrlError('too many redirects')
}

type OnceResult = { status: number; location?: string; contentType: string; body: string }

function requestOnce(
  target: CheckedTarget,
  { userAgent, deadline, maxBytes }: { userAgent: string; deadline: number; maxBytes: number },
): Promise<OnceResult> {
  return new Promise((resolve, reject) => {
    const remaining = deadline - Date.now()
    if (remaining <= 0) {
      reject(new Error('timeout'))
      return
    }
    const client = target.url.protocol === 'https:' ? https : http
    const req = client.request(
      target.url,
      {
        method: 'GET',
        // 使い回しの接続に乗らず、毎回この検査済みアドレスへ新しく接続する
        agent: false,
        headers: {
          'user-agent': userAgent,
          accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
          'accept-encoding': 'gzip, deflate, br',
        },
        // 検査済みのアドレスだけに接続する（検査後の DNS の差し替えを防ぐ）
        lookup: (_hostname, options, callback) => {
          const cb = callback as (...args: unknown[]) => void
          if ((options as { all?: boolean } | undefined)?.all) {
            cb(null, [{ address: target.address, family: target.family }])
          } else {
            cb(null, target.address, target.family)
          }
        },
      },
      (res) => {
        const status = res.statusCode ?? 0
        const contentType = String(res.headers['content-type'] ?? '')
        if (REDIRECTS.has(status) || !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
          res.resume()
          resolve({ status, location: res.headers.location, contentType, body: '' })
          return
        }

        const encoding = String(res.headers['content-encoding'] ?? '').toLowerCase()
        const stream =
          encoding === 'gzip' || encoding === 'x-gzip'
            ? res.pipe(zlib.createGunzip())
            : encoding === 'deflate'
              ? res.pipe(zlib.createInflate())
              : encoding === 'br'
                ? res.pipe(zlib.createBrotliDecompress())
                : res

        const chunks: Buffer[] = []
        let size = 0
        let settled = false
        const finish = () => {
          if (settled) return
          settled = true
          resolve({ status, contentType, body: Buffer.concat(chunks).toString('utf8') })
        }
        stream.on('data', (chunk: Buffer) => {
          if (settled) return
          const room = maxBytes - size
          size += chunk.length
          chunks.push(room < chunk.length ? chunk.subarray(0, Math.max(0, room)) : chunk)
          // 上限に達したら、そこまでで打ち切る（OGP は <head> にあるので先頭で足りる）
          if (size >= maxBytes) {
            finish()
            req.destroy()
          }
        })
        stream.on('end', finish)
        stream.on('error', (err) => {
          if (!settled) reject(err)
        })
      },
    )
    // 全体の制限時間（少しずつ送ってくる相手でも打ち切る）
    const timer = setTimeout(() => req.destroy(new Error('timeout')), remaining)
    req.on('close', () => clearTimeout(timer))
    req.on('error', reject)
    req.end()
  })
}
