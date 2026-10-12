// src/lib/quickpost/drafts.ts
// さっと投稿（/post）の下書きの保存。端末の中だけに持ち、画面（src/components/quickpost/QuickPostApp.tsx）から使う。
//   - 下書きはタブごとに別々の localStorage のキー（mk_post_draft:<タブの ID>）に持つ（最大10件・30日）。
//     タブは自分のキーだけを書き換えるので、同時に保存してもほかのタブの下書きを上書きしない。
//     タブの ID は sessionStorage に持つ（読み込み直しても同じタブ）
//   - 新しく開いたタブは、いちばん新しい下書きを引き継ぐ（写さずに、その下書きの持ち主をこのタブにする。
//     下書きのキーも同じなので、元のタブと両方から送っても投稿は1件＝サーバーの受付票、内容が違えば画面が知らせる）。
//     元のタブがこのあと書き換えた分は、別の下書きとして残る。引き継がれたあとに元のタブを読み込み直したときは、
//     同じ下書き（キー）が引き継がれたまま触られずに残っていれば引き取り直す（引き継いだタブを閉じても、元のタブで
//     続きを書ける）。引き継いだタブで書き換えた分はそのタブの下書きなので、引き取らない
//   - 投稿できたら、このタブの分と、ほかのタブにある「送った内容そのもの」と、同じ下書きを引き継いだまま書き換えていない分の
//     うち送った版より古いもの（送った下書きの古い版）を消す。同じ下書きをほかのタブで直した分は残す
//   - 既知の制限: ブラウザの「タブを複製」は sessionStorage も写すので、複製した2つのタブは同じ下書きを書き合う
//     （どちらから送っても投稿は1件。内容が違えば画面が知らせる）
// 保存先は引数で受け取る（単体テストで差し替える）。使えない・例外のときは保存しないで続ける。
import { POST_TYPES } from './input'

export type Draft = {
  text: string
  title: string
  showTitle: boolean
  postType: string
  /** 二重投稿を防ぐキー（この下書きを送るたびに同じものを使う） */
  key: string
}

/** inherited: ほかのタブから引き継いだまま、このタブではまだ書き換えていない分 */
type SavedDraft = Draft & { tab: string; savedAt: number; inherited: boolean }
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>
type SessionStore = Pick<Storage, 'getItem' | 'setItem'>
export type DraftStores = { local: Store | null; session: SessionStore | null; now?: () => number }

/** タブの下書きのキー（後ろにタブの ID） */
export const DRAFT_PREFIX = 'mk_post_draft:'
/** sessionStorage: このタブの ID と、いま書いている下書きのキー（{ tab, key }。空の下書き・投稿後は key なし） */
export const TAB_KEY = 'mk_post_tab'
export const MAX_DRAFTS = 10
export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const freshDraft = (): Draft => ({
  text: '',
  title: '',
  showTitle: false,
  postType: 'diary',
  key: crypto.randomUUID(),
})

/** まだ何も書いていない下書きか（開いたばかり・投稿し終えた直後・全部消した） */
export const isBlankDraft = (d: Draft) =>
  !d.text && !d.title && !d.showTitle && d.postType === 'diary'

export function parseDraft(v: unknown): Draft | null {
  if (!v || typeof v !== 'object') return null
  const d = v as Partial<Draft>
  if (typeof d.text !== 'string' || typeof d.key !== 'string') return null
  return {
    text: d.text,
    title: typeof d.title === 'string' ? d.title : '',
    showTitle: Boolean(d.showTitle),
    postType: (POST_TYPES as readonly string[]).includes(d.postType ?? '')
      ? (d.postType as string)
      : 'diary',
    key: d.key,
  }
}

export const sameDraft = (a: Draft, b: Draft) =>
  a.key === b.key &&
  a.text === b.text &&
  a.title === b.title &&
  a.showTitle === b.showTitle &&
  a.postType === b.postType

const nowOf = (stores: DraftStores) => (stores.now ?? Date.now)()

function readSaved(raw: string | null): (Draft & { savedAt: number; inherited: boolean }) | null {
  if (!raw) return null
  try {
    const v: unknown = JSON.parse(raw)
    const d = parseDraft(v)
    const { savedAt, inherited } = (v ?? {}) as { savedAt?: unknown; inherited?: unknown }
    return d && Number.isFinite(Number(savedAt))
      ? { ...d, savedAt: Number(savedAt), inherited: inherited === true }
      : null
  } catch {
    return null
  }
}

/**
 * 保存してある下書き（新しい順）。期限を過ぎたもの・形の合わないもの・多すぎる分（古いもの）は、ここで片付ける
 */
function readDrafts(stores: DraftStores): SavedDraft[] {
  const local = stores.local
  if (!local) return []
  try {
    const keys: string[] = []
    for (let i = 0; i < local.length; i++) {
      const k = local.key(i)
      if (k?.startsWith(DRAFT_PREFIX)) keys.push(k)
    }
    const since = nowOf(stores) - DRAFT_TTL_MS
    const list: SavedDraft[] = []
    for (const k of keys) {
      const saved = readSaved(local.getItem(k))
      if (saved && saved.savedAt > since) list.push({ ...saved, tab: k.slice(DRAFT_PREFIX.length) })
      else local.removeItem(k)
    }
    list.sort((a, b) => b.savedAt - a.savedAt)
    for (const old of list.splice(MAX_DRAFTS)) local.removeItem(DRAFT_PREFIX + old.tab)
    return list
  } catch {
    return []
  }
}

/**
 * 下書きの持ち主を付け替える（このタブの分として書いてから、元の分を消す。書けなければ元の分を残す）。
 * 引き継いだ印を付ける（このタブで書き換えると印は消える。印のある分は、同じ下書きが送られたら一緒に片付ける）。
 * 元の分は、読んだときのままのときだけ消す（その間に元のタブが書き換えていたら、そのタブの下書きとして残す）
 */
function moveDraft(stores: DraftStores, from: SavedDraft, tab: string) {
  if (from.tab === tab) return
  const draft = parseDraft(from)
  try {
    stores.local?.setItem(
      DRAFT_PREFIX + tab,
      JSON.stringify({ ...draft, savedAt: from.savedAt, inherited: true }),
    )
    const source = DRAFT_PREFIX + from.tab
    const current = readSaved(stores.local?.getItem(source) ?? null)
    if (current && current.savedAt === from.savedAt && sameDraft(current, from)) {
      stores.local?.removeItem(source)
    }
  } catch {
    // 付け替えられなくても、開いた下書きは画面に出す（書き換えたときに保存する）
  }
}

function readTab(stores: DraftStores): { tab: string; key: string | null } | null {
  try {
    const v: unknown = JSON.parse(stores.session?.getItem(TAB_KEY) ?? 'null')
    const { tab, key } = (v ?? {}) as { tab?: unknown; key?: unknown }
    return typeof tab === 'string' && tab ? { tab, key: typeof key === 'string' ? key : null } : null
  } catch {
    return null
  }
}

/**
 * このタブで書いている下書きを覚える（タブの ID と下書きのキー。読み込み直したときに使う）。
 * 空の下書き（投稿し終えた・全部消した）は、キーを覚えない（読み込み直しても、ほかのタブの下書きに乗り換えない）
 */
export function rememberTab(stores: DraftStores, tab: string, draft: Draft | null) {
  try {
    const key = draft && !isBlankDraft(draft) ? draft.key : null
    stores.session?.setItem(TAB_KEY, JSON.stringify({ tab, key }))
  } catch {
    // 使えないときは、読み込み直すと新しく開いたタブとして扱われる
  }
}

/**
 * このタブを開く。
 * - 読み込み直したタブ: 自分の下書き。無ければ、書いていた下書き（同じキー）がほかのタブに引き継がれたまま触られずに
 *   残っていれば引き取り直す（引き継いだタブで書き換えた分は、そのタブの下書きなので引き取らない）。それも無ければ null
 *   （新しい下書き。投稿し終えた・全部消したときはキーを覚えていないので乗り換えない）
 * - 新しく開いたタブ: 新しい ID と、いちばん新しい下書き（ほかのタブで書きかけのものも含む）を引き継ぐ。写さずに持ち主を
 *   付け替えるので、同じ下書きの古い版が端末に残らない（送ったあとに古い版が「書きかけ」として出てこない）
 */
export function openTab(stores: DraftStores): { tab: string; draft: Draft | null } {
  const list = readDrafts(stores)
  const saved = readTab(stores)
  let found: SavedDraft | undefined
  let tab: string
  if (saved) {
    tab = saved.tab
    found =
      list.find((d) => d.tab === tab) ??
      (saved.key ? list.find((d) => d.key === saved.key && d.inherited) : undefined)
  } else {
    tab = crypto.randomUUID()
    found = list[0]
  }
  if (found) moveDraft(stores, found, tab)
  const draft = found ? parseDraft(found) : null
  rememberTab(stores, tab, draft)
  return { tab, draft }
}

/**
 * このタブの下書きを保存する（ほかのタブの分には触らない）。何も書いていなければ、このタブの分を消す。
 * 中身が変わっていなければ書かない（読み込み直しただけで「いちばん新しい下書き」にならないように）
 */
export function saveDraft(stores: DraftStores, tab: string, d: Draft) {
  const key = DRAFT_PREFIX + tab
  try {
    const own = readSaved(stores.local?.getItem(key) ?? null)
    const fresh = own !== null && own.savedAt > nowOf(stores) - DRAFT_TTL_MS
    if (own && fresh && sameDraft(own, d)) return
    if (isBlankDraft(d)) {
      if (own) stores.local?.removeItem(key)
      return
    }
    stores.local?.setItem(key, JSON.stringify({ ...d, savedAt: nowOf(stores) }))
    // 多すぎる分・期限切れを片付ける（いま書いた分はいちばん新しいので残る）
    readDrafts(stores)
  } catch {
    // 保存できない（プライベートモードなど）ときは下書きなしで続ける
  }
}

/**
 * 投稿できた下書きを片付ける。このタブの分と、ほかのタブにある「送った内容そのもの」と、同じ下書きを引き継いだまま
 * 書き換えていない分（送った下書きの古い版を表示しているだけ）を消す。同じ下書きをほかのタブで直した分は残す
 * （そのタブから送れば、画面が「すでに投稿済み」と知らせる）
 */
export function clearDraft(stores: DraftStores, tab: string, sent: Draft) {
  try {
    // 送った版を書いた時刻。引き継いだ分のうち、これより新しいものは送った版より新しい内容（祖先ではない）なので残す
    const own = readSaved(stores.local?.getItem(DRAFT_PREFIX + tab) ?? null)
    const sentAt = own?.savedAt ?? nowOf(stores)
    stores.local?.removeItem(DRAFT_PREFIX + tab)
    for (const other of readDrafts(stores)) {
      const olderInherited = other.key === sent.key && other.inherited && other.savedAt <= sentAt
      if (sameDraft(other, sent) || olderInherited) {
        stores.local?.removeItem(DRAFT_PREFIX + other.tab)
      }
    }
  } catch {
    // 同上
  }
}
