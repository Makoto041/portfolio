// src/collections/QuickpostNonces.ts
// さっと投稿の「1回きり」の記録（管理画面には出さない。サーバーだけが読み書きする）。
//   challenge:<sha256> … 使い終えたパスキーの確認値。同じ確認値でのログイン・登録を2回通さない（ログアウトしても残る）
//   post:<uuid>        … 下書きごとの投稿の受付票。同じ下書きの再送・二度押しでも投稿は1件（postId に結果を残す）。
//                         digest に最初に送った内容の指紋を残し、送り直しのときに返す（直して送り直したかを画面が見分ける）
// key の一意制約で「最初の1回」だけを通す。期限（expiresAt）を過ぎたものは投稿のたびに片付ける。
// タイムラインの表には手を入れないので、この表の追加（マイグレーション）が遅れても公開ページは壊れない。
import type { CollectionConfig } from 'payload'

const never = () => false

export const QuickpostNonces: CollectionConfig = {
  slug: 'quickpost-nonces',
  labels: { singular: 'さっと投稿の記録', plural: 'さっと投稿の記録' },
  admin: { hidden: true },
  access: { read: never, create: never, update: never, delete: never },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'postId', type: 'number' },
    { name: 'digest', type: 'text' },
    { name: 'expiresAt', type: 'date', required: true, index: true },
  ],
}
