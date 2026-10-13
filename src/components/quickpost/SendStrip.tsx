// src/components/quickpost/SendStrip.tsx
// さっと投稿（/post）の送信の帯。ヘッダーのすぐ下に出す（キーボードが開いていても見える位置）。
//   送信中（何枚目か・あと何件か・進み具合）→ 投稿しました（タイムラインへ）。
//   送れなかったら、理由と「もう一度」「別の投稿として送る」「直す」。中身は src/lib/quickpost/outbox.ts の stripView。
import SodaIcon from '@/components/soda/SodaIcon'
import type { StripView } from '@/lib/quickpost/outbox'

type Props = {
  view: StripView
  /** ボタンには送信待ちの中での ID を渡す */
  onRetry: (id: string) => void
  onResend: (id: string) => void
  onEdit: (id: string) => void
}

export default function SendStrip({ view, onRetry, onResend, onEdit }: Props) {
  if (view.kind === 'none') return null

  if (view.kind === 'sending') {
    return (
      <section className="s-qp-strip is-sending" aria-label="送信の状況">
        <div className="s-qp-strip-in">
          <span className="s-qp-spin" aria-hidden="true" />
          <p className="s-qp-strip-txt">{view.label}</p>
          {view.more > 0 && <span className="s-qp-strip-more">あと{view.more}件</span>}
          <div className="s-qp-track" aria-hidden="true">
            <i style={{ width: `${view.pct}%` }} />
          </div>
        </div>
      </section>
    )
  }

  if (view.kind === 'done') {
    return (
      <section className="s-qp-strip is-done" aria-label="送信の状況">
        <div className="s-qp-strip-in">
          <SodaIcon name="check" />
          <p className="s-qp-strip-txt">投稿しました</p>
          <a className="s-qp-strip-link" href={`/timeline#post-${view.postId}`}>
            タイムラインで見る
          </a>
        </div>
      </section>
    )
  }

  return (
    <section className="s-qp-strip is-failed" aria-label="送信の状況">
      <div className="s-qp-strip-in">
        <SodaIcon name="alert" />
        <p className="s-qp-strip-txt">{view.message}</p>
        {view.more > 0 && <span className="s-qp-strip-more">ほか{view.more}件</span>}
        {(view.retry || view.resend || view.edit) && (
          <div className="s-qp-strip-act">
            {view.retry && (
              <button type="button" className="is-solid" onClick={() => onRetry(view.id)}>
                もう一度
              </button>
            )}
            {view.resend && (
              <button type="button" className="is-solid" onClick={() => onResend(view.id)}>
                別の投稿として送る
              </button>
            )}
            {view.edit && (
              <button type="button" onClick={() => onEdit(view.id)}>
                直す
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
