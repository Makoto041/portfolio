// src/lib/access.ts
// PayloadCMS のアクセス制御ヘルパー
// 「閲覧は公開・書き込みは管理者のみ」の原則を全コレクションで統一する
import type { Access } from 'payload'

/** 誰でも閲覧可 */
export const anyone: Access = () => true

/** 認証済み管理者（users コレクションのユーザー）のみ */
export const adminOnly: Access = ({ req: { user } }) => Boolean(user)
