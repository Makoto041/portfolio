import { describe, expect, it } from 'vitest'
import {
  clearDraft,
  DRAFT_PREFIX,
  DRAFT_TTL_MS,
  type Draft,
  type DraftStores,
  MAX_DRAFTS,
  openTab,
  parseDraft,
  saveDraft,
  TAB_ID_KEY,
} from '../quickpost/drafts'

function memoryStore() {
  const map = new Map<string, string>()
  let writes = 0
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      writes++
      map.set(k, v)
    },
    removeItem: (k: string) => {
      writes++
      map.delete(k)
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size
    },
    get writes() {
      return writes
    },
  }
}

/**
 * 同じ端末の localStorage を共有するタブ（sessionStorage はタブごと。reload() は同じタブの読み込み直し）。
 * withSession: false は sessionStorage が使えない（読み込むたびに新しいタブ）環境
 */
function device() {
  const local = memoryStore()
  let clock = 1_000_000
  const now = () => clock
  const newTab = ({ withSession = true } = {}) => {
    const stores: DraftStores = { local, session: withSession ? memoryStore() : null, now }
    const opened = openTab(stores)
    return {
      stores,
      id: opened.tab,
      opened: opened.draft,
      reload: () => openTab(stores),
      save: (d: Draft) => saveDraft(stores, opened.tab, d),
      clear: (sent: Draft) => clearDraft(stores, opened.tab, sent),
    }
  }
  /** 保存してある下書きの本文（新しい順。読むだけで保存先を変えない） */
  const texts = () =>
    Array.from({ length: local.length }, (_, i) => local.key(i) ?? '')
      .filter((k) => k.startsWith(DRAFT_PREFIX))
      .map((k) => JSON.parse(local.getItem(k) ?? '{}') as Draft & { savedAt: number })
      .sort((a, b) => b.savedAt - a.savedAt)
      .map((d) => d.text)
  return { local, newTab, texts, tick: (ms = 1000) => (clock += ms) }
}

const draft = (key: string, text: string, extra: Partial<Draft> = {}): Draft => ({
  text,
  title: '',
  showTitle: false,
  postType: 'diary',
  key,
  ...extra,
})

describe('タブごとの保存', () => {
  it('タブは自分のキーだけを書き換え、同じ下書きのキーでもほかのタブの分には触らない', () => {
    const d = device()
    const a = d.newTab()
    const b = d.newTab()
    a.save(draft('K', 'タブA'))
    d.tick()
    b.save(draft('K', 'タブB'))
    d.tick()
    a.save(draft('K', 'タブAを直した'))
    expect(d.texts()).toEqual(['タブAを直した', 'タブB'])
    expect(d.local.getItem(DRAFT_PREFIX + a.id)).toContain('タブAを直した')
    expect(d.local.getItem(DRAFT_PREFIX + b.id)).toContain('タブB')
  })

  it('何も書いていない下書きは、このタブの分を消す（無ければ書かない）', () => {
    const d = device()
    const a = d.newTab()
    a.save(draft('K', 'あ'))
    a.save(draft('K', ''))
    expect(d.texts()).toEqual([])
    const writes = d.local.writes
    a.save(draft('K2', ''))
    expect(d.local.writes).toBe(writes)
  })

  it('中身が変わっていなければ書かない（読み込み直しただけで、いちばん新しい下書きにならない）', () => {
    const d = device()
    const a = d.newTab()
    const b = d.newTab()
    a.save(draft('A', 'あ'))
    d.tick()
    b.save(draft('B', 'い'))
    d.tick()
    const writes = d.local.writes
    a.save(draft('A', 'あ'))
    expect(d.local.writes).toBe(writes)
    expect(d.texts()).toEqual(['い', 'あ'])
  })

  it(`保存は新しい ${MAX_DRAFTS} 件まで、${DRAFT_TTL_MS / 86_400_000} 日を過ぎたものは読まない`, () => {
    const d = device()
    const tabs = Array.from({ length: MAX_DRAFTS + 2 }, () => d.newTab())
    tabs.forEach((t, i) => {
      t.save(draft(`k${i}`, `本文${i}`))
      d.tick()
    })
    const kept = d.texts()
    expect(kept).toHaveLength(MAX_DRAFTS)
    expect(kept[0]).toBe(`本文${MAX_DRAFTS + 1}`)
    expect(kept).not.toContain('本文0')

    d.tick(DRAFT_TTL_MS)
    expect(d.newTab().opened).toBeNull()
    expect(d.texts()).toEqual([])
  })

  it('開いたままの古い下書きでも、保存し直せば残る（期限切れの自分の分は書き直す）', () => {
    const d = device()
    const a = d.newTab()
    a.save(draft('K', 'あ'))
    d.tick(DRAFT_TTL_MS + 1)
    a.save(draft('K', 'あ'))
    expect(a.reload().draft).toEqual(draft('K', 'あ'))
  })
})

describe('openTab', () => {
  it('新しく開いたタブは、いちばん新しい下書きを引き継ぐ（写さない。元のタブの分は無くなる）', () => {
    const d = device()
    const a = d.newTab()
    const b = d.newTab()
    a.save(draft('A', '古い'))
    d.tick()
    b.save(draft('B', '新しい'))
    const c = d.newTab()
    expect(c.opened).toEqual(draft('B', '新しい'))
    expect(c.stores.session?.getItem(TAB_ID_KEY)).toBe(c.id)
    expect(d.texts()).toEqual(['新しい', '古い'])
    expect(d.local.getItem(DRAFT_PREFIX + c.id)).toContain('新しい')
    expect(d.local.getItem(DRAFT_PREFIX + b.id)).toBeNull()
    expect(b.reload().draft).toBeNull()
  })

  it('読み込み直したタブは、ほかのタブがあとから保存した下書きではなく、自分の下書きを開く', () => {
    const d = device()
    const a = d.newTab()
    const b = d.newTab()
    a.save(draft('A', 'タブA'))
    d.tick()
    b.save(draft('B', 'タブB'))
    expect(a.reload()).toEqual({ tab: a.id, draft: draft('A', 'タブA') })
  })

  it('自分の下書きが無くなっていれば（全部消した・送った・引き継がれた）、ほかのタブの下書きに乗り換えない', () => {
    const d = device()
    const a = d.newTab()
    const b = d.newTab()
    b.save(draft('B', 'タブB'))
    expect(a.reload().draft).toBeNull()
  })

  it('保存先が使えない・壊れていても例外にしない（sessionStorage が無ければ毎回新しいタブ）', () => {
    const thrower = () => {
      throw new Error('denied')
    }
    const broken: DraftStores = {
      local: { getItem: thrower, setItem: thrower, removeItem: thrower, key: thrower, length: 1 },
      session: { getItem: thrower, setItem: thrower },
    }
    const opened = openTab(broken)
    expect(opened.draft).toBeNull()
    expect(() => saveDraft(broken, opened.tab, draft('A', 'あ'))).not.toThrow()
    expect(() => clearDraft(broken, opened.tab, draft('A', 'あ'))).not.toThrow()

    const garbage = memoryStore()
    garbage.setItem(`${DRAFT_PREFIX}x`, '{not json')
    expect(openTab({ local: garbage, session: null }).draft).toBeNull()
    expect(garbage.getItem(`${DRAFT_PREFIX}x`)).toBeNull()
    expect(openTab({ local: null, session: null }).tab).not.toBe(
      openTab({ local: null, session: null }).tab,
    )
  })
})

describe('clearDraft（投稿できたあと）', () => {
  it('引き継いだタブで直して送ると、元のタブの古い版は残らない（次に開いたタブは空で始まる）', () => {
    const d = device()
    const a = d.newTab()
    a.save(draft('K', 'a'))
    const b = d.newTab()
    expect(b.opened).toEqual(draft('K', 'a'))
    b.save(draft('K', 'ab'))
    b.clear(draft('K', 'ab'))
    expect(d.texts()).toEqual([])
    expect(d.newTab().opened).toBeNull()
  })

  it('sessionStorage が消える端末（ホーム画面のアプリなど）で開き直しを重ねても、送ったあとに古い版が残らない', () => {
    const d = device()
    const first = d.newTab({ withSession: false })
    first.save(draft('K', 'a'))
    const second = d.newTab({ withSession: false })
    second.save(draft('K', 'ab'))
    const third = d.newTab({ withSession: false })
    expect(third.opened).toEqual(draft('K', 'ab'))
    third.save(draft('K', 'abc'))
    third.clear(draft('K', 'abc'))
    expect(d.texts()).toEqual([])
    expect(d.newTab({ withSession: false }).opened).toBeNull()
  })

  it('同じ下書きを引き継いだタブがそのままなら、元のタブが送ると一緒に片付く', () => {
    const d = device()
    const a = d.newTab()
    a.save(draft('K', '送る本文'))
    const f = d.newTab()
    // A は送る直前に自分の分を保存し直す（引き継がれたあとなので、もう一度書く）
    a.save(draft('K', '送る本文'))
    expect(d.texts()).toEqual(['送る本文', '送る本文'])
    a.clear(draft('K', '送る本文'))
    expect(d.texts()).toEqual([])
    expect(f.reload().draft).toBeNull()
  })

  it('同じ下書きをほかのタブで直した分は残す（古い内容のタブから送っても、送っている間に直されても）', () => {
    const d = device()
    const a = d.newTab()
    a.save(draft('K', 'hello'))
    const b = d.newTab()
    b.save(draft('K', 'bye'))
    a.save(draft('K', 'hello'))
    a.clear(draft('K', 'hello'))
    expect(d.texts()).toEqual(['bye'])
    expect(b.reload().draft).toEqual(draft('K', 'bye'))
  })

  it('ほかの下書きには触らない', () => {
    const d = device()
    const a = d.newTab()
    const b = d.newTab()
    a.save(draft('A', '送る本文'))
    b.save(draft('B', '別の下書き'))
    a.clear(draft('A', '送る本文'))
    expect(d.texts()).toEqual(['別の下書き'])
  })
})

describe('parseDraft', () => {
  it('形の合わないものは捨て、知らない種類は日記に戻す', () => {
    expect(parseDraft(null)).toBeNull()
    expect(parseDraft({ text: 'あ' })).toBeNull()
    expect(parseDraft({ text: 'あ', key: 'K', postType: 'unknown' })?.postType).toBe('diary')
    expect(parseDraft({ text: 'あ', key: 'K', title: 1, showTitle: 'yes' })).toEqual({
      text: 'あ',
      title: '',
      showTitle: true,
      postType: 'diary',
      key: 'K',
    })
  })
})
