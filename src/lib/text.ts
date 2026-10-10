// ───────────────────────────────────────────
// src/lib/text.ts
// 文字数での切り詰め。String#slice は UTF-16 単位のため絵文字（サロゲートペア）を割ってしまうので、
// コードポイント単位で数える。純関数（server/client 共用）。
// ───────────────────────────────────────────

/** 文字数（コードポイント単位） */
export function charLength(text: string): number {
  return Array.from(text).length
}

/** max 文字を超えたら max 文字で切って「…」を付ける */
export function clip(text: string, max: number): string {
  if (charLength(text) <= max) return text
  return `${Array.from(text).slice(0, max).join('')}…`
}
