// src/collections/Passkeys.ts
// さっと投稿（/post）に Face ID / Touch ID でログインするためのパスキー（公開鍵）。
// 作成は /api/quickpost/register/verify だけ（管理画面のパスワード確認 + 端末での本人確認のあと）。
// 管理画面では一覧・名前の変更・削除だけができる。削除すると、そのパスキーでログイン中の端末もログアウトする。
import type {
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
} from 'payload'
import { adminOnly } from '@/lib/access'

const never = () => false

/**
 * Payload を通す更新（管理画面での名前の変更・API・payload.update）では、使用回数（counter）・同期の有無・
 * 最後に使った日時を書かない。これらはログインのときに生の SQL で進める（src/lib/quickpost/server.ts の recordPasskeyUse）。
 * Payload の更新は、書き換えられない項目も保存してある値で補って書き戻すので、名前の変更と同時に
 * 別の端末がログインすると、進んだ counter を古い値に戻してしまう。ここで外せば、その列は書かれない
 * （直す必要があるときは SQL で直す）
 */
export const keepLoginFields: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation === 'update') {
    delete data.counter
    delete data.backedUp
    delete data.lastUsedAt
  }
  return data
}

/**
 * パスキーを消すときは、そのパスキーでログインした端末も締め出す。
 * 削除の「前」に行う（post_sessions.passkey_id は ON DELETE SET NULL のため、削除後だと参照が先に空になり見つけられない）
 */
const revokeSessions: CollectionBeforeDeleteHook = async ({ req, id }) => {
  await req.payload.delete({
    collection: 'post-sessions',
    where: { passkey: { equals: id } },
    overrideAccess: true,
    req,
  })
}

export const Passkeys: CollectionConfig = {
  slug: 'passkeys',
  labels: { singular: 'パスキー', plural: 'パスキー' },
  admin: {
    group: 'さっと投稿',
    useAsTitle: 'name',
    defaultColumns: ['name', 'user', 'createdAt', 'lastUsedAt'],
    description:
      '投稿ページ（/post）に Face ID / Touch ID でログインするための鍵です。覚えのないものや、なくした端末のものは削除してください（その鍵でログイン中の端末もすぐログアウトします）。',
  },
  access: {
    read: adminOnly,
    create: never,
    update: adminOnly,
    delete: adminOnly,
  },
  hooks: { beforeChange: [keepLoginFields], beforeDelete: [revokeSessions] },
  fields: [
    { name: 'name', type: 'text', label: '名前', required: true },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      label: 'ユーザー',
      required: true,
      index: true,
      access: { update: never },
      admin: { readOnly: true },
    },
    {
      // WebAuthn の credential ID（base64url）。ログイン時はこれでパスキーを探す
      name: 'credentialId',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      access: { update: never },
      admin: { readOnly: true },
    },
    {
      // COSE 形式の公開鍵（base64url）。秘密鍵は端末から出ない
      name: 'publicKey',
      type: 'textarea',
      required: true,
      access: { update: never },
      admin: { hidden: true },
    },
    {
      name: 'counter',
      type: 'number',
      defaultValue: 0,
      access: { update: never },
      admin: { hidden: true },
    },
    { name: 'transports', type: 'text', access: { update: never }, admin: { hidden: true } },
    {
      name: 'backedUp',
      type: 'checkbox',
      label: 'iCloud キーチェーンなどで同期',
      defaultValue: false,
      access: { update: never },
      admin: { readOnly: true },
    },
    {
      name: 'lastUsedAt',
      type: 'date',
      label: '最後に使った日時',
      access: { update: never },
      admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
    },
  ],
}
