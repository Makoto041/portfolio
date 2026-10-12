// src/lib/quickpost/drafts.ts
// さっと投稿（/post）の下書きの保存。端末の中だけに持ち、画面（src/components/quickpost/QuickPostApp.tsx）から使う。
//   - 下書きはタブごとに1件ずつ localStorage に持つ（最大10件・30日）。タブは自分の分だけを書き換え、
//     ほかのタブの下書きを上書きしない。タブの ID は sessionStorage に持つ（読み込み直しても同じタブ）
//   - 新しく開いたタブは、いちばん新しい下書きを写して開く（下書きのキーも同じ。同じ下書きを2つのタブで
//     送っても投稿は1件になり＝サーバーの受付票、内容が違えば画面が知らせる）
//   - 投稿できたら、このタブの分と、ほかのタブにある「送った内容そのもの」（同じ下書きを開いただけ）を消す。
//     同じ下書きをほかのタブで直した分は残す
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
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type DraftStores = { local: Store | null; session: Store | null; now?: () => number }

export const DRAFTS_KEY = 'mk_post_drafts_v3'
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

/** 保存してある下書き（新しい順。期限を過ぎたもの・形の合わないものは除く） */
function readDrafts(stores: DraftStores): SavedDraft[] {
  try {
    const list: unknown = JSON.parse(stores.local?.getItem(DRAFTS_KEY) ?? '[]')
    if (!Array.isArray(list)) return []
    const since = nowOf(stores) - DRAFT_TTL_MS
    return list
      .flatMap((v): SavedDraft[] => {
        const d = parseDraft(v)
        const { tab, savedAt } = (v ?? {}) as { tab?: unknown; savedAt?: unknown }
        return d && typeof tab === 'string' && Number(savedAt) > since
          ? [{ ...d, tab, savedAt: Number(savedAt) }]
          : []
      })
      .sort((a, b) => b.savedAt - a.savedAt)
  } catch {
    return []
  }
}

function writeDrafts(stores: DraftStores, list: SavedDraft[]) {
  try {
    if (list.length === 0) stores.local?.removeItem(DRAFTS_KEY)
    else stores.local?.setItem(DRAFTS_KEY, JSON.stringify(list.slice(0, MAX_DRAFTS)))
  } catch {
    // 保存できない（プライベートモードなど）ときは下書きなしで続ける
  }
}

/**
 * このタブを開く。読み込み直したタブなら、前と同じタブの ID と自分の下書き（無ければ null = 新しい下書き）。
 * 新しく開いたタブなら、新しい ID と、いちばん新しい下書き（ほかのタブで書きかけのものも含む）。開いた下書きは
 * すぐこのタブの分として写す（読み込み直しても同じ下書きを開ける。元の下書きが送られたら、写しも一緒に片付く）
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
  const newest = list[0] ? parseDraft(list[0]) : null
  if (newest) saveDraft(stores, tab, newest)
  return { tab, draft: newest }
}

/**
 * このタブの下書きを保存する（ほかのタブの分には触らない）。何も書いていなければ、このタブの分を消す。
 * 中身が変わっていなければ書かない（読み込み直しただけで「いちばん新しい下書き」にならないように）
 */
export function saveDraft(stores: DraftStores, tab: string, d: Draft) {
  const list = readDrafts(stores)
  const own = list.find((x) => x.tab === tab)
  if (own && sameDraft(own, d)) return
  const others = list.filter((x) => x.tab !== tab)
  if (!isBlankDraft(d)) writeDrafts(stores, [{ ...d, tab, savedAt: nowOf(stores) }, ...others])
  else if (own) writeDrafts(stores, others)
}

/**
 * 投稿できた下書きを片付ける。このタブの分と、ほかのタブにある「送った内容そのもの」（同じ下書きを開いただけの写し）を消す。
 * 同じ下書きをほかのタブで直した分は残す（そのタブから送れば、画面が「すでに投稿済み」と知らせる）
 */
export function clearDraft(stores: DraftStores, tab: string, sent: Draft) {
  const list = readDrafts(stores)
  const next = list.filter((x) => x.tab !== tab && !sameDraft(x, sent))
  if (next.length !== list.length) writeDrafts(stores, next)
}
