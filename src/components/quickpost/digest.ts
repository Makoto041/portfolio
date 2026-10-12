// src/components/quickpost/digest.ts
// 送る内容の指紋（本文・タイトル・種類・写真の指紋をまとめたものの SHA-256）。
// サーバーの受付票に残り、同じ下書きの送り直しで「すでに投稿済み」と返るときに一緒に返ってくる。
// 画面はそれと今の指紋を比べて、直して送り直したかを見分ける（どのタブ・いつの送信が先でも、受付票の1つに決まる）

/** 内容の指紋（SHA-256 の16進 64 文字） */
export async function contentDigest(content: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}
