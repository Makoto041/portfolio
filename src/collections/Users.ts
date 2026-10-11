import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'
import { adminOnly } from '@/lib/access'

/** ユーザーを消すときは、そのユーザーのパスキーと投稿ページのログインも消す（参照が残らないように） */
const removeQuickPostAccess: CollectionBeforeDeleteHook = async ({ req, id }) => {
  await req.payload.delete({
    collection: 'post-sessions',
    where: { user: { equals: id } },
    overrideAccess: true,
    req,
  })
  await req.payload.delete({
    collection: 'passkeys',
    where: { user: { equals: id } },
    overrideAccess: true,
    req,
  })
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // ブルートフォース対策：5回失敗で10分間ロック
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    cookies: {
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },
  access: {
    // ユーザー情報の閲覧・管理は認証済みユーザーのみ
    read: adminOnly,
    create: adminOnly,
    update: adminOnly,
    delete: adminOnly,
  },
  admin: {
    useAsTitle: 'email',
  },
  hooks: { beforeDelete: [removeQuickPostAccess] },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
  ],
}
