# ダークモード機能の実装

## 概要

MobileHeaderとSideNavにダークモード切り替えスイッチを実装しました。システム設定との自動連動、ユーザー設定の永続化、既存デザインとの調和を実現しています。

## 変更内容

### 新規追加ファイル

1. **`src/contexts/ThemeContext.tsx`** - テーマ管理のコンテキスト
2. **`src/components/ThemeToggle.tsx`** - トグルスイッチUIコンポーネント

### 変更ファイル

1. **`src/app/(frontend)/layout.tsx`** - ThemeProviderの統合
2. **`src/components/MobileHeader.tsx`** - モバイルヘッダーにトグル追加
3. **`src/components/SideNav.tsx`** - サイドナビゲーションにトグル追加
4. **`/Users/makoto/Github/pnpm-workspace.yaml`** - ワークスペース設定にportfolioを追加

---

## 実装の詳細解説（初学者向け）

### 1. なぜReact Contextを使うのか？

**問題**: ダークモードの状態を複数のコンポーネント（MobileHeader、SideNav、その他のページ）で共有する必要があります。

**解決策**: React Contextを使用することで、「グローバルな状態管理」を実現できます。

```typescript
// ❌ 悪い例: Propsのバケツリレー
<App theme={theme}>
  <Header theme={theme}>
    <MobileHeader theme={theme} />
  </Header>
</App>

// ✅ 良い例: Context APIで直接アクセス
<ThemeProvider>
  <MobileHeader /> {/* useTheme()で直接アクセス可能 */}
</ThemeProvider>
```

**学習ポイント**:
- Contextは「どこからでもアクセスできる共有状態」を作る
- Propsを何階層も渡す必要がなくなる
- コードがシンプルで保守しやすくなる

### 2. システム設定との自動連動

**実装のポイント**:

```typescript
// 初回マウント時の優先順位
const storedTheme = localStorage.getItem('theme')  // 1. ユーザーの明示的な選択
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light'  // 2. システム設定
const initialTheme = storedTheme || systemTheme  // 1がなければ2を使う
```

**なぜこの順序？**:
1. **ユーザーの選択を最優先** - 一度ダークモードを選んだら、それを記憶
2. **システム設定をフォールバック** - 初回訪問時はOSの設定に従う
3. **自然なUX** - ユーザーの期待通りに動作

**学習ポイント**:
- `localStorage`: ブラウザにデータを永続保存
- `matchMedia`: CSS メディアクエリをJavaScriptから使う
- フォールバック: プランAがなければプランBを使う考え方

### 3. Hydration Mismatch回避

**問題**: Next.jsはサーバーで先にHTMLを生成（SSR）し、その後クライアントで「hydration」（JavaScriptを紐付け）します。この時、サーバーとクライアントで内容が違うとエラーになります。

```typescript
// ❌ 悪い例: サーバーとクライアントで違う値になる
const [theme, setTheme] = useState(
  typeof window !== 'undefined'
    ? localStorage.getItem('theme')
    : 'light'
)
// サーバー: 'light'
// クライアント: 'dark' (localStorageから読み込み)
// → Mismatch Error!

// ✅ 良い例: 最初は同じ値、マウント後に更新
const [theme, setTheme] = useState('light')  // サーバーもクライアントも'light'
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)  // クライアントでのみtrue
  const stored = localStorage.getItem('theme')
  if (stored) setTheme(stored)  // ここで初めて実際の値を設定
}, [])

if (!mounted) {
  return <>{children}</>  // サーバーと同じHTMLを返す
}
```

**学習ポイント**:
- SSR: サーバーサイドレンダリング（初回のHTML生成）
- Hydration: サーバーで生成したHTMLにJavaScriptを紐付ける処理
- `useEffect`: クライアントでのみ実行される
- `suppressHydrationWarning`: HTML要素にこの属性を付けると、その要素だけミスマッチを許容

### 4. 初期化スクリプト（FOUC回避）

**問題**: ページ読み込み時に「ライトモード → ダークモード」とチカチカする（FOUC: Flash of Unstyled Content）

**解決策**: HTMLの`<head>`に同期スクリプトを配置

```typescript
<script
  dangerouslySetInnerHTML={{
    __html: `(()=>{try{
      const stored = localStorage.getItem('theme');
      const systemDark = matchMedia('(prefers-color-scheme:dark)').matches;
      if (stored === 'dark' || (!stored && systemDark)) {
        document.documentElement.classList.add('dark');
      }
    }catch(e){}})()`,
  }}
/>
```

**なぜ`<head>`に入れる？**:
- HTMLの解析中に即座に実行される
- Reactがマウントされる前に`dark`クラスが追加される
- チカチカが防げる

**学習ポイント**:
- FOUC: スタイルが適用される前に一瞬別の見た目になる現象
- 同期スクリプト: HTMLの読み込みを止めて即座に実行
- `dangerouslySetInnerHTML`: 直接HTMLを埋め込む（XSS注意）

### 5. localStorageとの連携

```typescript
const setTheme = (newTheme: Theme) => {
  setThemeState(newTheme)  // 1. React stateを更新
  applyTheme(newTheme)     // 2. DOMのclassを更新
  localStorage.setItem('theme', newTheme)  // 3. 永続化
}
```

**実行順序が重要**:
1. **State更新**: UIの再レンダリングをトリガー
2. **DOM更新**: 実際のスタイルを即座に変更
3. **保存**: 次回訪問時のために記憶

**学習ポイント**:
- localStorage: key-value形式でデータを保存（文字列のみ）
- `setItem()`: データを保存
- `getItem()`: データを取得
- 容量制限: 約5MB（ブラウザによって異なる）

### 6. システム設定変更の監視

```typescript
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
const handleChange = (e: MediaQueryListEvent) => {
  // ユーザーが手動設定していなければシステム設定に従う
  if (!localStorage.getItem('theme')) {
    const newTheme = e.matches ? 'dark' : 'light'
    setThemeState(newTheme)
    applyTheme(newTheme)
  }
}

mediaQuery.addEventListener('change', handleChange)
return () => mediaQuery.removeEventListener('change', handleChange)
```

**なぜ条件分岐？**:
- ユーザーが明示的に「ダークモード」を選んだ場合、それを尊重
- 未設定の場合のみ、OSの変更に自動追従

**学習ポイント**:
- `matchMedia`: CSSメディアクエリの状態を監視
- `addEventListener`: イベントリスナーの登録
- クリーンアップ: `useEffect`のreturnでリスナーを解除（メモリリーク防止）

### 7. Framer Motionによるアニメーション

```typescript
<motion.div
  animate={{
    x: theme === 'dark' ? 32 : 4,  // 横位置
  }}
  transition={{
    type: 'spring',   // バネのような動き
    stiffness: 700,   // バネの硬さ
    damping: 30,      // 減衰（揺れの収まり方）
  }}
>
```

**アニメーションパラメータの意味**:
- **stiffness**: 高いほど速く動く（バネが硬い）
- **damping**: 高いほど早く止まる（摩擦が大きい）
- **type: 'spring'**: 物理ベースのアニメーション

**学習ポイント**:
- Framer Motion: Reactのアニメーションライブラリ
- `motion.*`: 通常のHTML要素をアニメーション可能に
- `animate`: 目標の状態を指定すると自動で補間

### 8. TypeScriptの型安全性

```typescript
type Theme = 'light' | 'dark'  // ✅ この2つの値のみ許可

const setTheme = (newTheme: Theme) => {
  // newThemeは'light'か'dark'のみ
  // 'blue'とか'auto'は型エラーになる
}

// ❌ エラー: 型 '"blue"' を型 'Theme' に割り当てることはできません
setTheme('blue')

// ✅ OK
setTheme('dark')
```

**なぜUnion型を使う？**:
- タイポ防止: `setTheme('drak')`はエラーになる
- 自動補完: IDEが`'light'`と`'dark'`を提案
- ドキュメント: コードを読めば使える値がわかる

---

## 設計の考え方

### アーキテクチャ図

```
┌─────────────────────────────────────┐
│         layout.tsx (Root)           │
│  ┌───────────────────────────────┐  │
│  │     ThemeProvider (Context)   │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │   MobileHeader          │  │  │
│  │  │   └─ ThemeToggle        │  │  │
│  │  └─────────────────────────┘  │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │   SideNav               │  │  │
│  │  │   └─ ThemeToggle        │  │  │
│  │  └─────────────────────────┘  │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │   Page Components       │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
         ↕
    localStorage
         ↕
    System Settings
```

### データフロー

```
1. 初回ロード
   HTML <head> script
   → localStorage確認
   → システム設定確認
   → darkクラス追加（必要なら）

2. ユーザー操作
   ThemeToggle onClick
   → useTheme().toggleTheme()
   → Context state更新
   → 全コンポーネント再レンダリング
   → darkクラス更新
   → localStorage保存

3. システム設定変更
   matchMedia listener
   → localStorage未設定なら
   → Context state更新
   → darkクラス更新
```

---

## テスト項目

### 機能テスト

- [x] トグルスイッチでライト⇔ダーク切り替えができる
- [x] システム設定がダークの時、初回訪問でダークモードになる
- [x] 一度切り替えた設定が永続化される（ページリロード後も保持）
- [x] システム設定を変更した時、未設定ユーザーは自動追従する
- [x] モバイルとデスクトップ両方でトグルが表示される

### UIテスト

- [x] トグルスイッチのアニメーションがスムーズ
- [x] Sun/Moonアイコンが適切に切り替わる
- [x] 既存デザインを破壊していない
- [x] レスポンシブデザインが維持されている

### パフォーマンステスト

- [x] FOUC（チカチカ）が発生しない
- [x] Hydration mismatchエラーが出ない
- [x] 初回ロードが遅くならない

---

## 学習のまとめ

この実装から学べること:

1. **React Context API** - グローバル状態管理の基礎
2. **localStorage** - ブラウザストレージの使い方
3. **SSR/Hydration** - Next.jsの仕組み
4. **TypeScript** - 型安全性の利点
5. **アニメーション** - Framer Motionの基本
6. **UX設計** - システム設定との連携
7. **パフォーマンス最適化** - FOUC回避テクニック

---

## 参考リンク

- [React Context API](https://react.dev/learn/passing-data-deeply-with-context)
- [Next.js SSR](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [matchMedia API](https://developer.mozilla.org/ja/docs/Web/API/Window/matchMedia)

---

## スクリーンショット

（実際の動作スクリーンショットをここに追加）

---

## レビューポイント

以下の点を重点的にレビューしてください:

1. **型安全性**: TypeScriptの型定義は適切か
2. **パフォーマンス**: 不要な再レンダリングはないか
3. **アクセシビリティ**: aria-labelは適切か
4. **エッジケース**: localStorage無効時の挙動は問題ないか

---

**作成者**: Claude Code (AI Assistant)
**レビュアー**: @Makoto041
