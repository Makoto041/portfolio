// src/collections/Letter.ts
import { CollectionConfig } from 'payload'
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT!),
  secure: false,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
})

const Letter: CollectionConfig = {
  slug: 'letter',
  labels: { singular: 'Letter', plural: 'Letters' },
  access: {
    read: () => true,
    create: () => true,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    afterChange: [
      async ({ doc, operation }) => {
        if (operation === 'create') {
          const { name, email, message } = doc

          await transporter.sendMail({
            from: `"お問い合わせ通知" <${process.env.SMTP_USER!}>`,
            to: 'makoto01401@gmail.com', // ← ここを固定アドレスに変更
            subject: '新しいお問い合わせが届きました',
            text: `
お名前: ${name}
メール: ${email || '（未登録）'}
メッセージ:
${message}`,
            html: `
              <p><strong>お名前:</strong> ${name}</p>
              <p><strong>メール:</strong> ${email || '（未登録）'}</p>
              <p><strong>メッセージ:</strong><br/>${message.replace(/\n/g, '<br/>')}</p>
            `,
          })
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'name', label: 'お名前', type: 'text', required: true },
    { name: 'email', label: 'メールアドレス', type: 'email' },
    { name: 'message', label: 'メッセージ', type: 'textarea', required: true },
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
