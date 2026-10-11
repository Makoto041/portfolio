// src/app/(post)/post/page.tsx
// さっと投稿。ログイン状態はページの描画ではなく、画面から /api/quickpost/session に問い合わせて決める
// （ログイン Cookie は SameSite=Strict のため、ほかのアプリのリンクから開いた直後の描画には付かない）。
// 毎回その場で描画する（CSP の nonce をリクエストごとに変えるため）。
import QuickPostApp from '@/components/quickpost/QuickPostApp'

export const dynamic = 'force-dynamic'

export default function PostPage() {
  return <QuickPostApp />
}
