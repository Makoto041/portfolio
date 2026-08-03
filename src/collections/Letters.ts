// src/collections/Letter.ts
import { CollectionConfig } from 'payload'
import nodemailer from 'nodemailer'
import { anyone, adminOnly } from '@/lib/access'

// SMTP 各段階のタイムアウトはサーバーレス関数のデッドラインより十分短くする
// （Nodemailer 既定は分単位で、応答しないSMTPサーバーに掴まると
//   リクエスト全体がタイムアウトし、利用者の再送 → 重複投稿につながる）
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT!),
  secure: false,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
  connectionTimeout: 5_000,
  greetingTimeout: 5_000,
  socketTimeout: 8_000,
})

// 送信全体の上限。超過しても投稿の保存は成功扱いにする
const MAIL_TIMEOUT_MS = 8_000

// 利用者入力を通知メールのHTMLへ埋め込む前にエスケープする
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const Letter: CollectionConfig = {
  slug: 'letter',
  labels: { singular: 'Letter', plural: 'Letters' },
  access: {
    read: adminOnly, // 問い合わせ内容は管理者のみ閲覧可（個人情報保護）
    create: anyone, // フォーム送信は誰でも可
    update: () => false,
    delete: adminOnly,
  },
  hooks: {
    afterChange: [
      async ({ doc, operation }) => {
        if (operation === 'create') {
          const { name, message } = doc
          // 通知先は環境変数から取得（アドレスをソースにハードコードしない）
          const to = process.env.CONTACT_NOTIFY_TO || process.env.SMTP_USER

          if (!to) {
            console.error('Letter 通知: CONTACT_NOTIFY_TO / SMTP_USER が未設定のため送信をスキップします')
            return doc
          }

          let timer: ReturnType<typeof setTimeout> | undefined
          try {
            const timeout = new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(new Error('mail send timeout')), MAIL_TIMEOUT_MS)
            })
            const send = transporter.sendMail({
              from: `"お問い合わせ通知" <${process.env.SMTP_USER!}>`,
              to,
              subject: '新しいお問い合わせが届きました',
              text: `
お名前: ${name}
メッセージ:
${message}`,
              html: `
                <p><strong>お名前:</strong> ${escapeHtml(String(name))}</p>
                <p><strong>メッセージ:</strong><br/>${escapeHtml(String(message)).replace(/\n/g, '<br/>')}</p>
              `,
            })
            // 送信が MAIL_TIMEOUT_MS 内に完了しなければ打ち切り、保存は成功のまま返す
            await Promise.race([send, timeout])
            // race で打ち切った場合も裏で走り続ける send の未処理拒否を防ぐ
            send.catch(() => {})
          } catch (err) {
            // 通知メールの失敗で投稿の保存自体を失敗させない
            console.error('Letter 通知メールの送信に失敗しました:', err)
          } finally {
            if (timer) clearTimeout(timer)
          }
        }
        return doc
      },
    ],
  },
  fields: [
    // 文字数上限は /api/letter だけでなくコレクション側でも強制する（多層防御）
    { name: 'name', label: 'お名前', type: 'text', required: true, maxLength: 100 },
    { name: 'message', label: 'メッセージ', type: 'textarea', required: true, maxLength: 5000 },
    {
      name: 'createdAt',
      label: '送信日時',
      type: 'date',
      admin: { readOnly: true },
      defaultValue: () => new Date().toISOString(),
    },
  ],
}

export default Letter
