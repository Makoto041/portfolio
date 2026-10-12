import { describe, expect, it } from 'vitest'
import {
  canSaveBeforeSend,
  clearDraft,
  DRAFT_TTL_MS,
  DRAFTS_KEY,
  type Draft,
  type DraftStores,
  loadDraft,
  MAX_DRAFTS,
  parseDraft,
  rememberTabDraft,
  saveDraft,
  storedDraft,
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

/** 同じ端末の localStorage を共有する、別々のタブ（sessionStorage はタブごと） */
function device() {
  const local = memoryStore()
  let clock = 1_000_000
  const tab = (): DraftStores & { session: ReturnType<typeof memoryStore> } => ({
    local,
    session: memoryStore(),
    now: () => clock,
  })
  return { local, tab, tick: (ms = 1000) => (clock += ms) }
}

const draft = (key: string, text: string, extra: Partial<Draft> = {}): Draft => ({
  text,
  title: '',
  showTitle: false,
  postType: 'diary',
  key,
  ...extra,
})

const texts = (stores: DraftStores) =>
  (JSON.parse(stores.local?.getItem(DRAFTS_KEY) ?? '[]') as Draft[]).map((d) => d.text)

describe('saveDraft / clearDraft', () => {
  it('同じキーの分だけを書き換え、ほかのキーの下書きには触らない', () => {
    const d = device()
    const a = d.tab()
    const b = d.tab()
    saveDraft(a, draft('A', 'タブA'))
    d.tick()
    saveDraft(b, draft('B', 'タブB'))
    d.tick()
    saveDraft(a, draft('A', 'タブAを直した'))
    expect(texts(a)).toEqual(['タブAを直した', 'タブB'])
  })

  it('何も書いていない下書きは、そのキーの分を消す（無ければ書かない）', () => {
    const d = device()
    const a = d.tab()
    saveDraft(a, draft('A', 'あ'))
    saveDraft(a, draft('A', ''))
    expect(texts(a)).toEqual([])
    const writes = d.local.writes
    saveDraft(a, draft('C', ''))
    expect(d.local.writes).toBe(writes)
  })

  it('中身が変わっていなければ書かない（開いただけで、いちばん新しい下書きにならない）', () => {
    const d = device()
    const a = d.tab()
    saveDraft(a, draft('A', 'あ'))
    d.tick()
    saveDraft(a, draft('B', 'い'))
    d.tick()
    const writes = d.local.writes
    saveDraft(a, draft('A', 'あ'))
    expect(d.local.writes).toBe(writes)
    expect(texts(a)).toEqual(['い', 'あ'])
  })

  it('送った内容そのものの分だけを消す（同じキーでほかのタブが直していたら残す）', () => {
    const d = device()
    const a = d.tab()
    saveDraft(a, draft('A', '送る本文'))
    saveDraft(a, draft('B', '別の下書き'))
    clearDraft(a, draft('A', '送る本文'))
    expect(texts(a)).toEqual(['別の下書き'])

    saveDraft(a, draft('K', 'ほかのタブで直した本文'))
    clearDraft(a, draft('K', '送った古い本文'))
    expect(texts(a)).toContain('ほかのタブで直した本文')
  })

  it(`保存は新しい ${MAX_DRAFTS} 件まで、${DRAFT_TTL_MS / 86_400_000} 日を過ぎたものは読まない`, () => {
    const d = device()
    const a = d.tab()
    for (let i = 0; i < MAX_DRAFTS + 2; i++) {
      saveDraft(a, draft(`k${i}`, `本文${i}`))
      d.tick()
    }
    const kept = texts(a)
    expect(kept).toHaveLength(MAX_DRAFTS)
    expect(kept[0]).toBe(`本文${MAX_DRAFTS + 1}`)
    expect(kept).not.toContain('本文0')

    d.tick(DRAFT_TTL_MS)
    expect(loadDraft(d.tab())).toBeNull()
  })
})

describe('loadDraft', () => {
  it('新しく開いたタブは、いちばん新しい下書きを開く', () => {
    const d = device()
    const a = d.tab()
    saveDraft(a, draft('A', '古い'))
    d.tick()
    saveDraft(a, draft('B', '新しい'))
    expect(loadDraft(d.tab())?.text).toBe('新しい')
  })

  it('読み込み直したタブは、ほかのタブがあとから保存した下書きではなく、自分の下書きを開く', () => {
    const d = device()
    const a = d.tab()
    const b = d.tab()
    rememberTabDraft(a, 'A')
    saveDraft(a, draft('A', 'タブA'))
    d.tick()
    saveDraft(b, draft('B', 'タブB'))
    expect(loadDraft(a)?.text).toBe('タブA')
  })

  it('自分の下書きが無くなっていれば（全部消した・送った）、ほかのタブの下書きに乗り換えない', () => {
    const d = device()
    const a = d.tab()
    rememberTabDraft(a, 'A')
    saveDraft(d.tab(), draft('B', 'タブB'))
    expect(loadDraft(a)).toBeNull()
  })

  it('保存先が使えない・壊れていても例外にしない', () => {
    const broken: DraftStores = {
      local: {
        getItem: () => {
          throw new Error('denied')
        },
        setItem: () => {
          throw new Error('denied')
        },
        removeItem: () => {
          throw new Error('denied')
        },
      },
      session: null,
    }
    expect(loadDraft(broken)).toBeNull()
    expect(() => saveDraft(broken, draft('A', 'あ'))).not.toThrow()
    expect(() => clearDraft(broken, draft('A', 'あ'))).not.toThrow()
    expect(() => rememberTabDraft(broken, 'A')).not.toThrow()

    const garbage = memoryStore()
    garbage.setItem(DRAFTS_KEY, '{not json')
    expect(loadDraft({ local: garbage, session: null })).toBeNull()
  })
})

describe('canSaveBeforeSend', () => {
  it('保存先に無いか、このタブが最後に書いた内容のままなら保存する', () => {
    expect(canSaveBeforeSend(null, null)).toBe(true)
    expect(canSaveBeforeSend(draft('K', 'あ'), draft('K', 'あ'))).toBe(true)
  })

  it('同じ下書きをほかのタブがあとから直していたら、古い内容で上書きしない', () => {
    const d = device()
    const a = d.tab()
    const b = d.tab()
    saveDraft(a, draft('K', 'hello'))
    const lastSavedByA = draft('K', 'hello')
    saveDraft(b, draft('K', 'bye'))
    expect(canSaveBeforeSend(storedDraft(a, 'K'), lastSavedByA)).toBe(false)
    expect(canSaveBeforeSend(storedDraft(a, 'K'), null)).toBe(false)
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
