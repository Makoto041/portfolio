import { CollectionConfig } from 'payload'
import { adminOnly } from '@/lib/access'

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
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
  ],
}
