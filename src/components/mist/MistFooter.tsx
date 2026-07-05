// src/components/mist/MistFooter.tsx
// Mist Terminal 共通フッター（トップ・全サブページで使用）
export default function MistFooter() {
  return (
    <footer className="footer">
      <span>
        © {new Date().getFullYear()} makoto iwabuchi — <i>slowly, but daily.</i>
      </span>
      <span className="ex">$ exit 0</span>
    </footer>
  )
}
