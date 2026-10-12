import { describe, expect, it } from 'vitest'
import {
  clearDraft,
  DRAFT_TTL_MS,
  DRAFTS_KEY,
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
    get writes() {
      return writes
    },
  }
}

/** 同じ端末の localStorage を共有するタブ（sessionStorage はタブごと。読み込み直しても同じ） */
function device() {
  const local = memoryStore()
  let clock = 1_000_000
  const now = () => clock
  /** 新しく開いたタブ。reload() は同じタブの読み込み直し */
  const newTab = () => {
    const stores: DraftStores = { local, session: memoryStore(), now }
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
  const texts = () =>
    (JSON.parse(local.getItem(DRAFTS_KEY) ?? '[]') as Draft[]).map((d) => d.text)
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
  it('タブは自分の分だけを書き換え、同じキーでもほかのタブの分には触らない', () => {
    const d = device()
    const a = d.newTab()
    const b = d.newTab()
    a.save(draft('K', 'タブA'))
    d.tick()
    b.save(draft('K', 'タブB'))
    d.tick()
    a.save(draft('K', 'タブAを直した'))
    expect(d.texts()).toEqual(['タブAを直した', 'タブB'])
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
    expect(d.newTab().opened?.text).toBe('い')
  })

  it(`保存は新しい ${MAX_DRAFTS} 件まで、${DRAFT_TTL_MS / 86_400_000} 日を過ぎたものは読まない`, () => {
    const d = device()
    for (let i = 0; i < MAX_DRAFTS + 2; i++) {
      d.newTab().save(draft(`k${i}`, `本文${i}`))
      d.tick()
    }
    const kept = d.texts()
    expect(kept).toHaveLength(MAX_DRAFTS)
    expect(kept[0]).toBe(`本文${MAX_DRAFTS + 1}`)
    expect(kept).not.toContain('本文0')

    d.tick(DRAFT_TTL_MS)
    expect(d.newTab().opened).toBeNull()
  })
})

describe('openTab', () => {
  it('新しく開いたタブは、いちばん新しい下書きを開き、自分の ID を覚える', () => {
    const d = device()
    d.newTab().save(draft('A', '古い'))
    d.tick()
    d.newTab().save(draft('B', '新しい'))
    const c = d.newTab()
    expect(c.opened?.text).toBe('新しい')
    expect(c.stores.session?.getItem(TAB_ID_KEY)).toBe(c.id)
  })

  it('読み込み直したタブは、ほかのタブがあとから保存した下書きではなく、自分の下書きを開く', () => {
    const d = device()
    const a = d.newTab()
    a.save(draft('A', 'タブA'))
    d.tick()
    d.newTab().save(draft('B', 'タブB'))
    expect(a.reload()).toEqual({ tab: a.id, draft: draft('A', 'タブA') })
  })

  it('自分の下書きが無くなっていれば（全部消した・送った）、ほかのタブの下書きに乗り換えない', () => {
    const d = device()
    const a = d.newTab()
    d.newTab().save(draft('B', 'タブB'))
    expect(a.reload().draft).toBeNull()
  })

  it('保存先が使えない・壊れていても例外にしない（sessionStorage が無ければ毎回新しいタブ）', () => {
    const thrower = () => {
      throw new Error('denied')
    }
    const broken: DraftStores = {
      local: { getItem: thrower, setItem: thrower, removeItem: thrower },
      session: { getItem: thrower, setItem: thrower, removeItem: thrower },
    }
    const opened = openTab(broken)
    expect(opened.draft).toBeNull()
    expect(() => saveDraft(broken, opened.tab, draft('A', 'あ'))).not.toThrow()
    expect(() => clearDraft(broken, opened.tab, draft('A', 'あ'))).not.toThrow()

    const garbage = memoryStore()
    garbage.setItem(DRAFTS_KEY, '{not json')
    expect(openTab({ local: garbage, session: null }).draft).toBeNull()
    expect(openTab({ local: null, session: null }).tab).not.toBe(openTab({ local: null, session: null }).tab)
  })
})

describe('clearDraft（投稿できたあと）', () => {
  it('このタブの分と、同じ下書きを開いただけのタブの写しを消し、ほかの下書きは残す', () => {
    const d = device()
    const a = d.newTab()
    a.save(draft('K', '送る本文'))
    const copy = d.newTab()
    expect(copy.opened).toEqual(draft('K', '送る本文'))
    copy.save(copy.opened as Draft)
    d.newTab().save(draft('B', '別の下書き'))
    a.clear(draft('K', '送る本文'))
    expect(d.texts()).toEqual(['別の下書き'])
  })

  it('開いただけのタブの写しは開いた時点で保存され、元の下書きが送られたら一緒に消える（読み込み直しても戻らない）', () => {
    const d = device()
    const a = d.newTab()
    a.save(draft('K', '送る本文'))
    const f = d.newTab()
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
    // A は古い「hello」のまま送り、送る直前に自分の分を保存する
    a.save(draft('K', 'hello'))
    a.clear(draft('K', 'hello'))
    expect(d.texts()).toEqual(['bye'])
    expect(b.reload().draft).toEqual(draft('K', 'bye'))
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
