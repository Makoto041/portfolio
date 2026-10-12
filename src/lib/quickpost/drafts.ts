// src/lib/quickpost/drafts.ts
// さっと投稿（/post）の下書きの保存。端末の中だけに持ち、画面（src/components/quickpost/QuickPostApp.tsx）から使う。
//   - 下書きはキーごとに1件ずつ localStorage に持つ（最大10件・30日）。ほかのキーの下書きは上書きも削除もしない
//   - このタブで書いている下書きのキーは sessionStorage に持つ（読み込み直したときに、ほかのタブの下書きと取り違えない）
//   - 新しく開いたタブは、いちばん新しい下書きをキーごと開く。同じ下書きを2つのタブで送っても投稿は1件になり
//     （サーバーの受付票）、内容が違えば画面が知らせる
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

type SavedDraft = Draft & { savedAt: number }
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export type DraftStores = { local: Store | null; session: Store | null; now?: () => number }

export const DRAFTS_KEY = 'mk_post_drafts_v2'
export const TAB_DRAFT_KEY = 'mk_post_tab_draft'
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

/** 保存してある下書き（新しい順。期限を過ぎたものは除く） */
function readDrafts(stores: DraftStores): SavedDraft[] {
  try {
    const list: unknown = JSON.parse(stores.local?.getItem(DRAFTS_KEY) ?? '[]')
    if (!Array.isArray(list)) return []
    const since = nowOf(stores) - DRAFT_TTL_MS
    return list
      .flatMap((v): SavedDraft[] => {
        const d = parseDraft(v)
        const savedAt = Number((v as { savedAt?: unknown } | null)?.savedAt)
        return d && savedAt > since ? [{ ...d, savedAt }] : []
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

/** 保存先にある、このキーの下書き */
export function storedDraft(stores: DraftStores, key: string): Draft | null {
  const found = readDrafts(stores).find((d) => d.key === key)
  return found ? parseDraft(found) : null
}

/**
 * このタブで開く下書き。読み込み直す前にこのタブで書いていた下書きがあればそれ（なければ null = 新しい下書き）。
 * 新しく開いたタブなら、いちばん新しく保存した下書き（ほかのタブで書きかけのものも含む）
 */
export function loadDraft(stores: DraftStores): Draft | null {
  const list = readDrafts(stores)
  let tabKey: string | null = null
  try {
    tabKey = stores.session?.getItem(TAB_DRAFT_KEY) ?? null
  } catch {
    // 使えないときは新しく開いたタブとして扱う
  }
  const found = tabKey ? list.find((d) => d.key === tabKey) : list[0]
  return found ? parseDraft(found) : null
}

/** このタブで書いている下書きのキーを覚える */
export function rememberTabDraft(stores: DraftStores, key: string) {
  try {
    stores.session?.setItem(TAB_DRAFT_KEY, key)
  } catch {
    // 同上
  }
}

/**
 * 下書きを保存する。同じキーの分だけを書き換え、ほかのキーの下書きには触らない。何も書いていなければ、そのキーの分を消す。
 * 中身が変わっていなければ書かない（開いただけ・読み込み直しただけで「いちばん新しい下書き」にならないように）
 */
export function saveDraft(stores: DraftStores, d: Draft) {
  const list = readDrafts(stores)
  const current = list.find((x) => x.key === d.key)
  if (current && sameDraft(current, d)) return
  const others = list.filter((x) => x.key !== d.key)
  if (!isBlankDraft(d)) writeDrafts(stores, [{ ...d, savedAt: nowOf(stores) }, ...others])
  else if (others.length !== list.length) writeDrafts(stores, others)
}

/**
 * 送った下書きを消す。そのキーの分が送った内容そのもののときだけ消す
 * （送っている間に、同じ下書きを開いたほかのタブが直していたら、それは残す。ほかのキーの下書きには触らない）
 */
export function clearDraft(stores: DraftStores, sent: Draft) {
  const list = readDrafts(stores)
  const next = list.filter((x) => !sameDraft(x, sent))
  if (next.length !== list.length) writeDrafts(stores, next)
}

/**
 * 送る直前に、この下書きを保存し直してよいか。保存先にこのキーの分が無いか、このタブが最後に書いた（読み込んだ）内容の
 * ままなら保存する。違っていれば、同じ下書きを開いたほかのタブがあとから直したので、このタブの古い内容で上書きしない
 * （同じキーで送るので、保存しなくても二重には投稿されない）
 */
export function canSaveBeforeSend(stored: Draft | null, lastSaved: Draft | null): boolean {
  return stored === null || (lastSaved !== null && sameDraft(stored, lastSaved))
}
