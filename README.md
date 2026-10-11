# iwabuchi-makoto.com — ライフログ / ポートフォリオ

岩渕誠（いわぶちまこと）の個人サイト。日記・写真・制作ログをタイムライン形式で残す
「ライフログ」を主軸に、ブログ / ギャラリー / イベント / 制作物紹介を備えた
Payload CMS 駆動の Next.js サイトです。

**公開URL**: https://iwabuchi-makoto.com

## デザイン — Soda Press

大きな丸いロゴと、パステルの地 × 黒い1本線で組んだ独自デザインシステム。
タイムライン（日記帳）が主役。詳細は `docs/README.md`。

- 題字「MAKOTO」の下に、いちばん新しい投稿を大きく置く（ロゴは投稿に重ねない・PC は左寄せ）
- タイムラインは日付ごとの日記帳（曜日の丸 + M.D）。写真・リンクプレビュー・いいね
- 文字は写真に重ねず、写真の下に置く（最新の投稿・つくったもの・イベントのカード）
- SP は画面下のドック（ホーム / 写真 / ブログ / プロフィール / メニュー）で親指で移動
- 地色は「今月の色」パレット（`src/lib/palette.ts`。固定 or 月替わりを1行で切替）
- トークンは `src/app/(frontend)/soda.css` の `.soda` スコープに集約（文字・線 `--s-*`・
  タイポ `--s-fs-*`・角丸 `--s-r-*`・4px 系余白）。本文テキストはどのパレットでも AA (4.5:1) 以上
- `prefers-reduced-motion` 対応（ティッカー・ロゴの弾み・アニメーションを停止）

## 技術スタック

| レイヤ | 技術 |
| --- | --- |
| フレームワーク | Next.js 15 (App Router / Server Components / ISR) + React 19 |
| CMS | Payload CMS 3（管理画面 `/admin`） |
| DB | Neon (PostgreSQL) — `@payloadcms/db-vercel-postgres` |
| ストレージ | Cloudflare R2（S3 互換）+ CloudFront 配信（`toCFUrl`） |
| スタイル | Tailwind CSS 4（CSS-first）+ ハンドメイドの Soda Press トークン |
| 計測 | Vercel Analytics |
| デプロイ | Vercel |
| テスト | Vitest（純関数ユーティリティの単体テスト） |

## アーキテクチャ

```text
src/
├── app/
│   ├── (frontend)/            # 公開ページ
│   │   ├── layout.tsx         # <html>（フォント・地色パレット・JSON-LD）
│   │   ├── page.tsx           # ホーム: 題字 + 最新の投稿 + タイムライン + TODAY + 写真
│   │   ├── soda.css           # Soda Press デザイントークン + 全スタイル
│   │   ├── og/                # OGP 画像（1200×630 を動的生成）
│   │   └── (site)/            # サブページ共通シェル（SodaShell）
│   │       ├── timeline/      # 全件タイムライン（20件 + REST 追加読込・フィルタ）
│   │       ├── posts/         # ブログ（Lexical リッチテキスト）
│   │       ├── gallery/       # 写真アーカイブ（masonry + 前後移動つき写真ビューア）
│   │       ├── events/ products/ profile/ letter/
│   ├── (post)/post/           # さっと投稿（スマホ用の投稿画面。専用ルートレイアウト・nonce つき CSP）
│   ├── (payload)/             # Payload 管理画面 + REST API（/api/<collection>）
│   └── api/                   # カスタム API（weather / letter / like / LINE webhook / quickpost）
├── collections/               # Payload コレクション定義
├── features/                  # ページのデータ取得・集計・表示モデル（home / site）
├── components/soda/           # Soda Press コンポーネント群（シェル・題字・タイムライン・カード）
├── components/gallery/        # 写真ビューア（<dialog>）とギャラリー
├── components/quickpost/      # さっと投稿の画面（パスキー・写真の縮小・下書き）
├── lib/quickpost/             # さっと投稿のログイン・回数制限・入力チェック・写真の作り直し
├── middleware.ts              # /post だけに nonce つき CSP
└── lib/                       # date / palette / phrase / richtext / social / cfUrl / netguard などの純関数
```

### データフロー

- 各ページは ISR（`revalidate = 60`）+ コレクションの `afterChange` フックによる
  on-demand `revalidatePath` で更新が即時反映される
- ホームの取得は `src/features/home/getHomePageData.ts`、TODAY（おしらせ・数字）と外枠（SNS）は
  `src/features/site/` に集約。コレクション単位で `catch` して縮退するため、一部の取得失敗が
  ページ全体を巻き込まない
- タイムラインの追加読込は Payload REST（`GET /api/timeline?page=N&where[postType][in]=...`）
  をクライアントから直接叩く（`read: anyone` の公開コレクション）
- LINE から Timeline へ投稿する webhook（`/api/line/webhook`）を持つ
  （詳細は `docs/LINE_TIMELINE_SETUP.md`）
- スマホからの投稿は「さっと投稿」（`/post`・下記）

### Payload コレクション

| slug | 用途 |
| --- | --- |
| `timeline` | タイムライン投稿（richText・画像・いいね・URL プレビュー） |
| `blogPosts` / `blog-media` | ブログ記事とその画像 |
| `media` | 写真（ギャラリー / タイムライン専用フラグ付き） |
| `events` | 配信・イベント記録（プラットフォーム・期間・LIVE 判定） |
| `products` | 制作物カタログ |
| `notices` | おしらせ（ティッカー・TODAY カード） |
| `letters` | 問い合わせフォーム送信 |
| `users` | 管理者認証 |
| `passkeys` | さっと投稿のパスキー（公開鍵のみ。管理画面で削除するとその鍵の端末もログアウト） |
| `post-sessions` | さっと投稿にログイン中の端末（Cookie の SHA-256 だけを保存。削除 = その端末を即ログアウト） |
| `quickpost-nonces` | さっと投稿の1回きりの記録（使用済みの確認値・投稿の受付票。管理画面には出さない） |
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

## さっと投稿（/post）

スマホから本文・写真（3枚まで）・種類だけでタイムラインに投稿する自分専用の画面。
ホーム画面に追加すると `/post` から開く（`public/post.webmanifest`）。

- **ログイン**: Face ID / Touch ID のパスキー（WebAuthn・`@simplewebauthn`）。本人確認（UV）必須。
  新しい端末の登録は、そのつど管理画面のメールアドレスとパスワードを確かめてから（5回失敗で10分ロック）
- **ログイン状態**: 端末ごとに `post-sessions` に記録し、管理画面で削除すると即無効。
  使わなければ 30 日・最長 90 日で切れる。Cookie は `__Host-`・HttpOnly・Secure・SameSite=Strict、
  中身は 256bit 乱数（DB には SHA-256 のみ）。パスキーの確認値は HMAC 署名つきの 5 分 Cookie で持ち、
  使い終えたら `quickpost-nonces` に記録して2回目を拒否（ログアウト後も残る）。登録・ログインの書き込みは1つのトランザクション
- **送信**: すべての書き込みで Origin（と `Sec-Fetch-Site`）を確認。1台あたり 投稿 30件/時・写真 60枚/時
  （1回の UPDATE で数えるので、同時に送られても上限を超えない）
- **写真**: スマホで縮小してから送り、サーバーで作り直す（形式を中身で判定・向きを反映・位置情報など撮影データを削除・ランダムなファイル名）
- **二重投稿**: 下書きごとの UUID で受付票（`quickpost-nonces`・一意）を取り、再送・二度押しでも1件。
  タイムラインの表は変えないので、マイグレーションの適用が遅れても公開ページは壊れない
- **画面**: `noindex`・`no-store`・nonce つき CSP（`src/middleware.ts`）・埋め込み禁止

API: `GET /api/quickpost/session` / `POST /api/quickpost/{login,register}/{options,verify}` /
`POST /api/quickpost/photo` / `POST /api/quickpost/posts` / `POST /api/quickpost/logout`

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
- **リンクのプレビュー**: サーバーが取りに行く URL は `src/lib/netguard.ts` で検査し、
  内部ネットワーク（localhost・プライベート IP・クラウドのメタデータ）へは接続しない（DNS の差し替え・リダイレクトも検査）

## 今後の改善予定

- Products のケーススタディ化（課題・役割・技術構成・成果のフィールド追加と詳細ページ）
- E2E / アクセシビリティテストの導入（Playwright + axe）
- JSON-LD プロフィールの CMS 一元化
