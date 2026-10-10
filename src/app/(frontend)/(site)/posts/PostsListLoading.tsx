// ブログ一覧の読み込み中スケルトン（行の形だけを淡く出す）
export default function PostsListLoading() {
  return (
    <div className="s-blist is-page" aria-busy="true" aria-label="読み込み中">
      {[0, 1, 2].map((i) => (
        <div key={i} className="s-brow" aria-hidden="true">
          <div>
            <div className="s-skel" style={{ width: '30%', height: 12 }} />
            <div className="s-skel" style={{ width: '70%', height: 18, marginTop: 12 }} />
            <div className="s-skel" style={{ width: '90%', height: 14, marginTop: 10 }} />
          </div>
          <div className="s-bth s-skel" />
        </div>
      ))}
    </div>
  )
}
