# iwabuchi-makoto.com — ライフログ / ポートフォリオ

岩渕誠（いわぶちまこと）の個人サイト。日記・写真・制作ログをタイムライン形式で残す
「ライフログ」を主軸に、ブログ / ギャラリー / イベント / 制作物紹介を備えた
Payload CMS 駆動の Next.js サイトです。

**公開URL**: https://iwabuchi-makoto.com

## デザイン — Mist Terminal

「群青 × ミスト × ターミナル」をコンセプトにした独自デザインシステム。

- `whoami` / `git log` / `ls ./gallery` などのターミナルメタファーで全ページを統一
- git log 風のコミットタイムライン、macOS 風タイトルバー
- ライトターミナル固定（ダークモードなし）。トークンは `src/app/(frontend)/mist.css` の
  `.mist` スコープに集約（タイポ6段 `--fs-*`・本文系カラー10トークン `--m-*`・4px 系余白）
- テキストトークンは背景 `#eef1f4` 上で WCAG AA (4.5:1) 以上を維持
- `prefers-reduced-motion` 対応（タイプライター・マーキー・ブロブは停止）

## 技術スタック

| レイヤ | 技術 |
| --- | --- |
| フレームワーク | Next.js 15 (App Router / Server Components / ISR) + React 19 |
| CMS | Payload CMS 3（管理画面 `/admin`） |
| DB | Neon (PostgreSQL) — `@payloadcms/db-vercel-postgres` |
| ストレージ | Cloudflare R2（S3 互換）+ CloudFront 配信（`toCFUrl`） |
| スタイル | Tailwind CSS 4（CSS-first）+ ハンドメイドの Mist Terminal トークン |
| 計測 | Vercel Analytics |
| デプロイ | Vercel |
| テスト | Vitest（純関数ユーティリティの単体テスト） |

## アーキテクチャ

```
src/
├── app/
│   ├── (frontend)/            # 公開ページ（トップは独自シェル）
│   │   ├── page.tsx           # トップ: Timeline ダイジェスト + Gallery + Portal
│   │   ├── mist.css           # Mist Terminal デザイントークン + 全スタイル
│   │   └── (site)/            # サブページ共通シェル（MistShell）
│   │       ├── timeline/      # 全件タイムライン（20件 + REST 追加読込）
│   │       ├── posts/         # ブログ（Lexical リッチテキスト）
│   │       ├── gallery/       # 写真アーカイブ（masonry + <dialog> モーダル）
│   │       ├── events/ products/ profile/ letter/
│   ├── (payload)/             # Payload 管理画面 + REST API（/api/<collection>）
│   └── api/                   # カスタム API（weather / letter / like / LINE webhook）
├── collections/               # Payload コレクション定義
├── features/home/             # トップページのデータ取得・集計・表示モデル
├── components/mist/           # Mist Terminal コンポーネント群
└── lib/                       # date / social / spotify / cfUrl などの純関数・クライアント
```

### データフロー

- 各ページは ISR（`revalidate = 60`）+ コレクションの `afterChange` フックによる
  on-demand `revalidatePath` で更新が即時反映される
- トップページの取得は `src/features/home/getHomePageData.ts` に集約。コレクション単位で
  `catch` して縮退するため、一部の取得失敗がページ全体を巻き込まない
- タイムラインの追加読込は Payload REST（`GET /api/timeline?page=N&where[postType][in]=...`）
  をクライアントから直接叩く（`read: anyone` の公開コレクション）
- LINE から Timeline へ投稿する webhook（`/api/line/webhook`）を持つ
  （詳細は `docs/LINE_TIMELINE_SETUP.md`）

### Payload コレクション

| slug | 用途 |
| --- | --- |
| `timeline` | タイムライン投稿（richText・画像・いいね・URL プレビュー） |
| `blogPosts` / `blog-media` | ブログ記事とその画像 |
| `media` | 写真（ギャラリー / タイムライン専用フラグ付き） |
| `events` | 配信・イベント記録（プラットフォーム・期間・LIVE 判定） |
| `products` | 制作物カタログ |
| `notices` | トップの NOTICE ローテーション |
| `letters` | 問い合わせフォーム送信 |
| `users` | 管理者認証 |
| グローバル `site-settings` | プロフィール・ヒーロー文言・Spotify プレイリスト |

## ローカル開発

```bash
pnpm install
cp .env.example .env   # 下記の環境変数を設定
pnpm dev               # http://localhost:3000（管理画面は /admin）
```

### 環境変数

| 変数 | 用途 |
| --- | --- |
| `POSTGRES_URL` | Neon (PostgreSQL) 接続文字列 |
| `PAYLOAD_SECRET` | Payload の暗号化シークレット |
| `S3_ENDPOINT` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_BUCKET` / `S3_REGION` | Cloudflare R2（S3 互換） |
| `NEXT_PUBLIC_CLOUDFRONT_DOMAIN` | 画像配信 CDN ドメイン（未設定なら相対 URL のまま） |
| `NEXT_PUBLIC_SITE_URL` | CORS / CSRF の許可オリジン |

### スクリプト

```bash
pnpm dev             # 開発サーバー
pnpm build           # プロダクションビルド（postbuild で sitemap 生成）
pnpm lint            # ESLint
pnpm typecheck       # tsc --noEmit
pnpm test            # Vitest（lib/ の単体テスト）
pnpm format          # Prettier チェック（format:fix で書き込み）
pnpm generate:types  # Payload スキーマ → TypeScript 型生成
```

### DB マイグレーション

コレクション / グローバルのフィールドを変更したら:

```bash
pnpm payload migrate:create <name>   # 生成してコミットするだけ
```

適用（`pnpm payload migrate`）はデプロイ側に委ねる（ローカルの `.env` は本番 Neon を
指すため、手元から本番へは適用しない）。

## 実装上の工夫

- **転送量**: タイムラインは初期 20 件のみ SSR し、以降はページ単位の REST 追加読込。
  SP ではギャラリーマーキー・重複プロフィールを描画段階で間引く
- **モバイル性能**: スピナー等の高頻度 `setState` を CSS アニメーションへ移譲、
  タブ非表示・画面外では NOTICE のタイプ演出を停止。SP はブロブ・`backdrop-filter` を軽量化
- **アクセシビリティ**: 画像モーダルはネイティブ `<dialog>`（Esc / フォーカストラップ /
  フォーカス復帰 / スクロールロック）。タップ領域は擬似要素で 44px 以上を確保
- **プライバシー**: 訪問者の位置情報系の外部リクエストなし（天気は自サイトのプロキシ API・東京固定）
- **画像**: next/image + AVIF/WebP、CloudFront 変換（`toCFUrl`）。外部 OGP 画像は
  `unoptimized` で直接参照し、画像オプティマイザを任意ホストへ開放しない

## 今後の改善予定

- Products のケーススタディ化（課題・役割・技術構成・成果のフィールド追加と詳細ページ）
- E2E / アクセシビリティテストの導入（Playwright + axe）
- JSON-LD プロフィールの CMS 一元化
