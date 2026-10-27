// src/lib/mailer.ts
// SMTP 送信の入口。お問い合わせ通知（Letters）と Payload 本体のメール（パスワード再設定など）で共有する。
import nodemailer from 'nodemailer'
import type { EmailAdapter } from 'payload'

const host = process.env.SMTP_HOST
const port = Number(process.env.SMTP_PORT)
const user = process.env.SMTP_USER
const pass = process.env.SMTP_PASS

/** SMTP の接続情報が揃っているか（手元や Preview で未設定のときは送らずにログだけ出す） */
export const isSmtpConfigured = Boolean(host && Number.isFinite(port) && port > 0 && user && pass)

/** 送信元アドレス（SMTP のユーザー名と同じ。未設定なら空） */
export const smtpFromAddress = user ?? ''

// SMTP 各段階のタイムアウトはサーバーレス関数のデッドラインより十分短くする
// （Nodemailer 既定は分単位で、応答しないSMTPサーバーに掴まると
//   リクエスト全体がタイムアウトし、利用者の再送 → 重複投稿につながる）。
// 期限超過時は Nodemailer 自身が下層ソケットを閉じてエラーを返すため、
// 外側で Promise.race 等により打ち切ると接続だけが放置される。行わないこと。
export const smtpTransport = isSmtpConfigured
  ? nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 8_000,
    })
  : null

const DEFAULT_FROM_NAME = 'ポートフォリオ'

/**
 * Payload の `email` に渡すアダプタ。
 * `email` が無いと Payload は初期化のたびに「No email adapter provided」の警告を出し、
 * メール（管理画面のパスワード再設定など）は実際には送られない。
 * 公式の @payloadcms/email-nodemailer は nodemailer 6 系を連れてくるため使わず、同じ送信口を薄く包む。
 * SMTP が未設定の環境では、初期化では何も出さず、送ろうとした時だけ警告する（Payload の標準と同じく送信は成功扱い）。
 */
export const smtpEmailAdapter: EmailAdapter = ({ payload }) => ({
  name: 'smtp',
  defaultFromAddress: smtpFromAddress,
  defaultFromName: DEFAULT_FROM_NAME,
  sendEmail: async (message) => {
    if (!smtpTransport) {
      payload.logger.warn(
        `SMTP が未設定のためメールを送れませんでした（件名: ${String(message.subject)}）。SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS を確認してください`,
      )
      return
    }
    return smtpTransport.sendMail({
      ...message,
      from: message.from ?? `"${DEFAULT_FROM_NAME}" <${smtpFromAddress}>`,
    })
  },
})
