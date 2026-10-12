// src/lib/access.ts
// PayloadCMS のアクセス制御ヘルパー
// 「閲覧は公開・書き込みは管理者のみ」の原則を全コレクションで統一する
import type { Access } from 'payload'

/** 誰でも閲覧可 */
export const anyone: Access = () => true

/** 認証済み管理者（users コレクションのユーザー）のみ */
export const adminOnly: Access = ({ req: { user } }) => Boolean(user)

/**
 * 公開してよい画像だけ（ログイン中の管理者はすべて）。さっと投稿で上げて、まだ投稿に使っていない写真（pending）は
 * 公開の API（/api/media・投稿の中の画像）に出さない。pending が空の行は公開扱い
 */
export const publishedMediaOnly: Access = ({ req: { user } }) =>
  user ? true : { or: [{ pending: { equals: false } }, { pending: { exists: false } }] }
