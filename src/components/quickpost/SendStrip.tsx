// src/components/quickpost/SendStrip.tsx
// さっと投稿（/post）の送信の帯。ヘッダーのすぐ下に出す（キーボードが開いていても見える位置）。
//   送信中（何枚目か・あと何件か・進み具合）→ 投稿しました（タイムラインへ）。
//   送れなかったら、理由と「もう一度」「別の投稿として送る」「直す」。中身は src/lib/quickpost/outbox.ts の stripView。
import SodaIcon from '@/components/soda/SodaIcon'
import type { StripView } from '@/lib/quickpost/outbox'

type Props = {
  view: StripView
  onRetry: (key: string) => void
  onResend: (key: string) => void
  onEdit: (key: string) => void
}

export default function SendStrip({ view, onRetry, onResend, onEdit }: Props) {
  if (view.kind === 'none') return null

  if (view.kind === 'sending') {
    return (
      <div className="s-qp-strip is-sending">
        <div className="s-qp-strip-in">
          <span className="s-qp-spin" aria-hidden="true" />
          <p className="s-qp-strip-txt">{view.label}</p>
          {view.more > 0 && <span className="s-qp-strip-more">あと{view.more}件</span>}
          <div className="s-qp-track" aria-hidden="true">
            <i style={{ width: `${view.pct}%` }} />
          </div>
        </div>
      </div>
    )
  }

  if (view.kind === 'done') {
    return (
      <div className="s-qp-strip is-done">
        <div className="s-qp-strip-in">
          <SodaIcon name="check" />
          <p className="s-qp-strip-txt">投稿しました</p>
          <a className="s-qp-strip-link" href={`/timeline#post-${view.postId}`}>
            タイムラインで見る
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="s-qp-strip is-failed">
      <div className="s-qp-strip-in">
        <SodaIcon name="alert" />
        <p className="s-qp-strip-txt">{view.message}</p>
        {view.more > 0 && <span className="s-qp-strip-more">ほか{view.more}件</span>}
        {(view.retry || view.resend || view.edit) && (
          <div className="s-qp-strip-act">
            {view.retry && (
              <button type="button" className="is-solid" onClick={() => onRetry(view.key)}>
                もう一度
              </button>
            )}
            {view.resend && (
              <button type="button" className="is-solid" onClick={() => onResend(view.key)}>
                別の投稿として送る
              </button>
            )}
            {view.edit && (
              <button type="button" onClick={() => onEdit(view.key)}>
                直す
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
