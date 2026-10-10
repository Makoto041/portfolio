import { describe, expect, it } from 'vitest'
import { phraseChunks } from '../phrase'

describe('phraseChunks', () => {
  it('語の切れ目で分割し、連結すると元の文字列に戻る', () => {
    const text = 'ISRにしたらめちゃくちゃ表示早くなった'
    const chunks = phraseChunks(text)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join('')).toBe(text)
  })

  it('語の途中では切らない（めちゃくちゃ は1チャンク内に収まる）', () => {
    const chunks = phraseChunks('ISRにしたらめちゃくちゃ表示早くなった')
    expect(chunks.some((c) => c.includes('めちゃくちゃ'))).toBe(true)
  })

  it('句読点・記号は直前のチャンクに付く', () => {
    const chunks = phraseChunks('お便り、メッセージお待ちしてます！')
    expect(chunks[0].endsWith('、')).toBe(true)
    expect(chunks.at(-1)?.endsWith('！')).toBe(true)
  })

  it('カタカナ語の連続（複合語）は途中で切らない', () => {
    const chunks = phraseChunks('サイトリニューアルしました！')
    expect(chunks.some((c) => c.includes('サイトリニューアル'))).toBe(true)
    expect(chunks.join('')).toBe('サイトリニューアルしました！')
  })

  it('空文字は空配列', () => {
    expect(phraseChunks('')).toEqual([])
  })
})
