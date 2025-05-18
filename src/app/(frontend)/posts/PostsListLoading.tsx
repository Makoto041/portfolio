// ローディング時のグレーアウト（2件分だけ例として表示）
export default function PostsListLoading() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {[...Array(4)].map((_, i) => (
        <div
          key={i}
          className="glass animate-pulse rounded-lg overflow-hidden p-6 flex flex-col opacity-70"
        >
          <div className="bg-gray-200 w-full h-48 mb-4 rounded" />
          <div className="bg-gray-200 h-6 w-2/3 mb-2 rounded" />
          <div className="bg-gray-200 h-4 w-1/3 mb-4 rounded" />
          <div className="bg-gray-200 h-10 w-full rounded" />
        </div>
      ))}
    </div>
  )
}
