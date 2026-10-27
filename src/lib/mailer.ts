// src/lib/mailer.ts
// SMTP 送信の入口。お問い合わせ通知（Letters）と Payload 本体のメール（パスワード再設定など）で共有する。
import nodemailer from 'nodemailer'
import type { EmailAdapter } from 'payload'

// Vercel の環境変数に貼り付けたときの前後の空白・改行を取り除く（パスワードは変えない）
const host = process.env.SMTP_HOST?.trim()
// ポートは 10 進の数字だけ（Number() は 1e3 や 0x24b も通すため、先に形を確かめる）
const portText = process.env.SMTP_PORT?.trim() ?? ''
const port = /^\d{1,5}$/.test(portText) ? Number(portText) : NaN
const user = process.env.SMTP_USER?.trim()
const pass = process.env.SMTP_PASS

/** SMTP の接続情報が揃っているか（手元や Preview で未設定のときは送らずにログだけ出す） */
export const isSmtpConfigured = Boolean(host && Number.isInteger(port) && port > 0 && port <= 65535 && user && pass)

// 送信元は SMTP_FROM で分けられる（SendGrid の "apikey" や SES のアクセスキーのように、
// SMTP のユーザー名がメールアドレスでないプロバイダ向け）。未設定なら SMTP_USER のまま
const FROM_ADDRESS_PATTERN = /^[^\s<>"@]+@[^\s<>"@]+$/
const fromEnv = process.env.SMTP_FROM?.trim()
const fromEnvIsValid = Boolean(fromEnv && FROM_ADDRESS_PATTERN.test(fromEnv))
if (fromEnv && !fromEnvIsValid) {
  console.warn('SMTP_FROM がメールアドレスの形ではないため無視します（SMTP_USER を送信元にします）')
}

/** 送信元アドレス（SMTP_FROM、無ければ SMTP のユーザー名。どちらも無ければ空） */
export const smtpFromAddress = fromEnvIsValid ? (fromEnv as string) : (user ?? '')

// SMTP 各段階のタイムアウトはサーバーレス関数のデッドラインより十分短くする
// （Nodemailer 既定は分単位で、応答しないSMTPサーバーに掴まると
//   リクエスト全体がタイムアウトし、利用者の再送 → 重複投稿につながる）。
// 期限超過時は Nodemailer 自身が下層ソケットを閉じてエラーを返すため、
// 外側で Promise.race 等により打ち切ると接続だけが放置される。行わないこと。
export const smtpTransport = isSmtpConfigured
  ? nodemailer.createTransport({
      host,
      port,
      // 465 は接続した時点から TLS（暗黙的 TLS）。それ以外は STARTTLS を必須にして、
      // 認証情報やメール本文を平文で送る接続にフォールバックさせない
      secure: port === 465,
      requireTLS: port !== 465,
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
        `SMTP が未設定のためメールを送れませんでした（件名: ${message.subject || '(なし)'}）。SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS を確認してください`,
      )
      return
    }
    return smtpTransport.sendMail({
      ...message,
      from: message.from ?? `"${DEFAULT_FROM_NAME}" <${smtpFromAddress}>`,
    })
  },
})
