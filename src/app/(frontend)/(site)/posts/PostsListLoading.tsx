// ローディング時のスケルトン（Mist Terminal 意匠）
export default function PostsListLoading() {
  return (
    <div className="cardgrid">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="ccard animate-pulse">
          <div className="thumb" />
          <div className="cbody">
            <div style={{ height: 12, width: '30%', background: 'oklch(0.9 0.02 262)' }} />
            <div style={{ height: 14, width: '70%', background: 'oklch(0.9 0.02 262)' }} />
            <div style={{ height: 32, width: '100%', background: 'oklch(0.92 0.015 262)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
