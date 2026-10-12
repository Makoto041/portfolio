// src/lib/quickpost/drafts.ts
// さっと投稿（/post）の下書きの保存。端末の中だけに持ち、画面（src/components/quickpost/QuickPostApp.tsx）から使う。
//   - 下書きはタブごとに別々の localStorage のキー（mk_post_draft:<タブの ID>）に持つ（最大10件・30日）。
//     タブは自分のキーだけを書き換えるので、同時に保存してもほかのタブの下書きを上書きしない。
//     タブの ID は sessionStorage に持つ（読み込み直しても同じタブ）
//   - 新しく開いたタブは、いちばん新しい下書きを引き継ぐ（写さずに、その下書きの持ち主をこのタブにする。
//     下書きのキーも同じなので、元のタブと両方から送っても投稿は1件＝サーバーの受付票、内容が違えば画面が知らせる）。
//     元のタブがこのあと書き換えた分は、別の下書きとして残る。引き継がれたあとに元のタブを読み込み直すと、新しい下書きになる
//   - 投稿できたら、このタブの分と、ほかのタブにある「送った内容そのもの」を消す。同じ下書きをほかのタブで直した分は残す
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

type SavedDraft = Draft & { tab: string; savedAt: number }
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>
type SessionStore = Pick<Storage, 'getItem' | 'setItem'>
export type DraftStores = { local: Store | null; session: SessionStore | null; now?: () => number }

/** タブの下書きのキー（後ろにタブの ID） */
export const DRAFT_PREFIX = 'mk_post_draft:'
export const TAB_ID_KEY = 'mk_post_tab'
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

function readSaved(raw: string | null): (Draft & { savedAt: number }) | null {
  if (!raw) return null
  try {
    const v: unknown = JSON.parse(raw)
    const d = parseDraft(v)
    const savedAt = Number((v as { savedAt?: unknown }).savedAt)
    return d && Number.isFinite(savedAt) ? { ...d, savedAt } : null
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
 * このタブを開く。読み込み直したタブなら、前と同じタブの ID と自分の下書き（無ければ null = 新しい下書き）。
 * 新しく開いたタブなら、新しい ID と、いちばん新しい下書き（ほかのタブで書きかけのものも含む）を引き継ぐ。
 * 写さずに持ち主を付け替えるので、同じ下書きの古い版が端末に残らない（送ったあとに古い版が「書きかけ」として出てこない）
 */
export function openTab(stores: DraftStores): { tab: string; draft: Draft | null } {
  const list = readDrafts(stores)
  let tab: string | null = null
  try {
    tab = stores.session?.getItem(TAB_ID_KEY) ?? null
  } catch {
    // 使えないときは新しく開いたタブとして扱う
  }
  if (tab) {
    const own = list.find((d) => d.tab === tab)
    return { tab, draft: own ? parseDraft(own) : null }
  }
  tab = crypto.randomUUID()
  try {
    stores.session?.setItem(TAB_ID_KEY, tab)
  } catch {
    // 同上
  }
  const newest = list[0]
  if (!newest) return { tab, draft: null }
  const draft = parseDraft(newest)
  try {
    stores.local?.setItem(DRAFT_PREFIX + tab, JSON.stringify({ ...draft, savedAt: newest.savedAt }))
    stores.local?.removeItem(DRAFT_PREFIX + newest.tab)
  } catch {
    // 引き継げなくても、開いた下書きは画面に出す（書き換えたときに保存する）
  }
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
 * 投稿できた下書きを片付ける。このタブの分と、ほかのタブにある「送った内容そのもの」（同じ下書きを開いただけの写し）を消す。
 * 同じ下書きをほかのタブで直した分は残す（そのタブから送れば、画面が「すでに投稿済み」と知らせる）
 */
export function clearDraft(stores: DraftStores, tab: string, sent: Draft) {
  try {
    stores.local?.removeItem(DRAFT_PREFIX + tab)
    for (const other of readDrafts(stores)) {
      if (sameDraft(other, sent)) stores.local?.removeItem(DRAFT_PREFIX + other.tab)
    }
  } catch {
    // 同上
  }
}
