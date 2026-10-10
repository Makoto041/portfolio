import { describe, expect, it } from 'vitest'
import { lexicalFirstImageUrl, lexicalToPlainText } from '../richtext'

const para = (...texts: string[]) => ({
  type: 'paragraph',
  children: texts.map((t) => ({ type: 'text', text: t })),
})

describe('lexicalToPlainText', () => {
  it('段落を改行でつないだプレーンテキストにする', () => {
    const data = { root: { children: [para('リニューアルしました'), para('若干、、、、笑')] } }
    expect(lexicalToPlainText(data)).toBe('リニューアルしました\n若干、、、、笑')
  })

  it('リンクなどの入れ子の子ノードのテキストも拾う', () => {
    const data = {
      root: {
        children: [
          {
            type: 'paragraph',
            children: [
              { type: 'text', text: '参考：' },
              { type: 'link', children: [{ type: 'text', text: 'example.com' }] },
            ],
          },
        ],
      },
    }
    expect(lexicalToPlainText(data)).toBe('参考：example.com')
  })

  it('空段落が続いても改行は最大2つに丸める', () => {
    const data = { root: { children: [para('A'), para(), para(), para(), para('B')] } }
    expect(lexicalToPlainText(data)).toBe('A\n\nB')
  })

  it('文字列はそのまま・不正値は空文字', () => {
    expect(lexicalToPlainText('  hello ')).toBe('hello')
    expect(lexicalToPlainText(null)).toBe('')
    expect(lexicalToPlainText({})).toBe('')
  })
})

describe('lexicalFirstImageUrl', () => {
  it('populate 済みの upload ノードの URL を本文の順で返す', () => {
    const data = {
      root: {
        children: [
          { type: 'paragraph', children: [{ type: 'text', text: 'はじめに' }] },
          { type: 'upload', value: 42 },
          { type: 'list', children: [{ type: 'listitem', children: [{ type: 'upload', value: { url: '/media/a.jpg' } }] }] },
          { type: 'upload', value: { url: '/media/b.jpg' } },
        ],
      },
    }
    expect(lexicalFirstImageUrl(data)).toBe('/media/a.jpg')
  })

  it('画像が無い・不正値は null', () => {
    expect(lexicalFirstImageUrl({ root: { children: [{ type: 'paragraph', children: [] }] } })).toBeNull()
    expect(lexicalFirstImageUrl(null)).toBeNull()
    expect(lexicalFirstImageUrl('text')).toBeNull()
  })
})

