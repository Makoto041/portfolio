import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'
import { adminOnly } from '@/lib/access'
import { SITE_URL, adminResetUrl } from '@/lib/siteUrl'

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
    forgotPassword: {
      // 本文の文言は Payload 既定のまま、リンクだけ自サイトの URL に固定する
      // （serverURL を設定していないので、既定だと Host ヘッダー由来のリンクになる）
      generateEmailHTML: (args) => {
        const { req, token } = args ?? {}
        if (!req || !token) throw new Error('forgotPassword: req / token がありません')
        const url = adminResetUrl(SITE_URL, req.payload.config.routes.admin, req.payload.config.admin.routes.reset, token)
        return `${req.t('authentication:youAreReceivingResetPassword')}
    <a href="${url}">${url}</a>
    ${req.t('authentication:youDidNotRequestPassword')}`
      },
    },
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
