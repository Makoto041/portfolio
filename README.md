# iwabuchi-makoto.com — ライフログ / ポートフォリオ

岩渕誠（いわぶちまこと）の個人サイト。日記・写真・制作ログをタイムライン形式で残す
「ライフログ」を主軸に、ブログ / ギャラリー / イベント / 制作物紹介を備えた
Payload CMS 駆動の Next.js サイトです。

**公開URL**: https://iwabuchi-makoto.com

## デザイン — Soda Press

大きな丸いロゴと、パステルの地 × 1本線（いまは深い群青）で組んだ独自デザインシステム。
タイムライン（日記帳）が主役。詳細は `docs/README.md`。

- 題字「MAKOTO」の下に、いちばん新しい投稿を大きく置く（ロゴは投稿に重ねない・PC は左寄せ）
- タイムラインは日付ごとの日記帳（曜日の丸 + M.D）。写真・リンクプレビュー・いいね
- 文字は写真に重ねず、写真の下に置く（最新の投稿・つくったもの・イベントのカード）
- SP は画面下のドック（ホーム / 写真 / ブログ / プロフィール / メニュー）で親指で移動
- 地色は「今月の色」パレット（`src/lib/palette.ts`。固定 or 月替わりを1行で切替）。いまは群青（文字・線まで深い群青、地とカードは群青の濃淡）
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
├── components/quickpost/      # さっと投稿の画面（パスキー・写真の縮小と先送り・送信待ち・下書き）
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
cp .env.example .env   # 下記の環境変数を設定（DB は開発用。下の「開発用の DB」）
pnpm payload migrate   # 空の DB なら、最初に表を作る
pnpm dev               # http://localhost:3000（管理画面は /admin）
```

### 環境変数

| 変数 | 用途 |
| --- | --- |
| `POSTGRES_URL` | Neon (PostgreSQL) 接続文字列。手元と Preview は開発用の DB（下の「開発用の DB」）。本番の接続文字列は Vercel の Production にだけ置く |
| `PAYLOAD_DEV_PUSH` | `true` のときだけ `pnpm dev` がコレクションの変更を DB の表へそのまま反映する（Payload の push）。開発用の DB でだけ使う |
| `PAYLOAD_SECRET` | Payload の暗号化シークレット（ログインの鍵の署名にも使う。手元と Preview は本番と別の値） |
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

適用は本番デプロイのビルドで自動で行う（`vercel.json` の buildCommand が
`pnpm run migrate:deploy && pnpm run build`。中身は `scripts/migrate-on-deploy.ts`）。

- Vercel の Production のビルドだけで動く。Preview・ローカルのビルドでは何もしない
- 未適用が無ければ何もしない
- dev mode でスキーマを直接書き換えた記録（`payload_migrations` の batch -1。`PAYLOAD_DEV_PUSH=true` の `pnpm dev` をその DB に向けて動かすと付く）が
  あるときは、未適用が全部「足すだけで、二度目も通る」形のときだけ当てる。表・列・索引を `IF NOT EXISTS` で足す文と、
  すでにあれば何もしない外部キー・列挙型（`DO $$ … WHEN duplicate_object THEN null; END $$;`）だけの形で、
  `src/lib/deployMigrate.ts` の `isAdditiveMigration` が up の SQL を確かめる。1つでも違えば何も当てずにビルドを止める（手で確かめる）
- そのため、マイグレーションは生成したあと `ADD COLUMN` を `ADD COLUMN IF NOT EXISTS` に、選択肢の追加
  （`ALTER TYPE … ADD VALUE`）を `ADD VALUE IF NOT EXISTS` に直すなどして、足すだけで二度目も通る形にしておく
  （本番の DB には、以前 `.env` が本番を指したまま `pnpm dev` を動かしたときの dev mode の記録が残っていて、この形でないと本番デプロイが止まる）
- 今ある表に必須の列（`NOT NULL`）を足すときは `DEFAULT` も付ける（無いと行のある表で失敗し、本番デプロイが止まる）
- 足した選択肢（`ADD VALUE`）は、同じマイグレーションの中ではまだ使えない（列の既定値にするなどは、次のマイグレーションに分ける）
- 適用は1件ずつトランザクション。失敗したり未適用が残ったりしたらビルドを止める（そのデプロイは公開されず、今の本番が動き続ける）
- 新しいコードの公開より先に適用されるので、マイグレーションは今の本番のコードとも両立する形（表や空でよい列の追加など）にする
- Preview のビルドでは適用しないので、既存の表に列を足す PR の Preview は、開発用の DB に当てるまで
  その表を読むところが失敗する（例: `media.pending` を足した PR では `/api/media` や写真）。本番はビルドの最初に適用するので起きない
- 前提: Vercel の「Automatically expose System Environment Variables」がオン（`VERCEL_ENV` で本番かを見分ける。無ければビルドを止める）
- 本番ビルドが同時に2本走ると片方が失敗し、古いコミットの方が公開されることがある。そのときは新しい方を Redeploy する。
  Instant Rollback は再ビルドしないので、前のコードが新しいスキーマの上で動く（追加だけのマイグレーションなら問題ない）

手元から本番へは手で適用しない（本番の接続文字列は手元に置かない）。

### 開発用の DB

手元（`.env`）と Vercel の Preview / Development は、本番とは別の DB を使う。
本番の接続文字列は Vercel の Production の環境変数にだけ置く。下の手順で切り替えるまでは、手元の `.env` は本番を指しているものとして扱う。

1. Neon のコンソールで、本番のブランチから開発用のブランチ（`dev`）を作る（その時点の本番の表とデータを写した、別の DB になる）。
   本番のロール（DB のユーザー）もそのまま写るので、`dev` のロールのパスワードをリセットして本番と別にする（リセットはブランチごと）
2. Neon の SQL Editor で `dev` ブランチを選び、本番から写った dev mode の記録を消す（本番のブランチでは実行しない）

   ```sql
   DELETE FROM payload_migrations WHERE batch = -1;
   ```

   これで、開発用の DB では `pnpm payload migrate` が確認なしで進み、確認が出るのは本番（や push を使った DB）だけになる
3. `dev` の接続文字列（Connect の画面で Connection pooling をオンにした、ホストに `-pooler` が付く方）を、手元の `.env` の
   `POSTGRES_URL` に書く（`.env.local` があればそちらが優先されるので、同じく直す）
4. Vercel の Settings → Environment Variables で `POSTGRES_URL` を、Production は本番のまま、Preview と Development は `dev` の接続文字列にする。
   Vercel の Storage（Neon の連携）が入れた変数でここから書き換えられないときは、連携の設定で Preview / Development へのつなぎ方を変える。
   変えたあとの Preview は、再デプロイすると新しい値を使う
5. `PAYLOAD_SECRET` も、手元と Vercel の Preview / Development は本番と別の値にする（`openssl rand -hex 32` などで作る）。
   同じ値だと、開発用の DB や Preview で作ったログインの鍵（トークン）が、本番でもそのまま通ってしまう。
   別の値にしても、管理画面のパスワードはそのまま使える

`dev` を本番の最新に合わせ直したいときは、Neon の Reset from parent を使う（本番の記録も写り直すので、2 をもう一度行う）。

写真のファイル（R2）は本番と同じバケットのまま。開発用の DB（手元・Preview）では、管理画面から写真（media・blog-media）を
消さない・差し替えない・上げない。消したり差し替えたりすると本番の同じ写真が表示されなくなり、上げると同じ名前の本番のファイルを
上書きすることがある（名前が重ならないかは、それぞれの DB の中でしか確かめない）。さっと投稿の写真は毎回ちがう名前なので、上げてよい。

`pnpm dev` は、既定では DB の表を変えない。コレクションを変えたら `pnpm payload migrate:create <name>` で作った
マイグレーションを、`pnpm payload migrate` で開発用の DB に当てて確かめる（本番には本番デプロイのビルドが当てる）。

- `pnpm payload migrate` が「dev mode で動かしたことがある。続けるか」と確認を出したら、N で止める。
  本番を指しているか、push を使った DB（開発用の DB なら、2 の DELETE をしてからやり直す）
- 確認に答えられない環境（エージェントのシェルなど）では、確認が出ると何も当てずに成功として終わる。
  当たったかは `pnpm payload migrate:status` で確かめる
- 開発用の DB で表を手早くコードに合わせたいときだけ `PAYLOAD_DEV_PUSH=true pnpm dev` にする（Payload の dev mode の push。DB に dev mode の記録が付く）。
  古いブランチで使うと、新しい表や列を消してよいかの確認（DATA LOSS WARNING）が出る。その確認には No で答える（No なら `pnpm dev` は表を変えずに終わる）

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
- **写真**: スマホで縮小してから送り、サーバーで作り直す（形式を中身で判定・向きを反映・位置情報など撮影データを削除・ランダムなファイル名）。
  投稿に使うまでは「投稿待ち」（`media.pending`）の印を付け、ログインしていない人には `/api/media` や投稿の中の画像として出さない
  （印は投稿の保存と同じトランザクションで外す）
  写真は選んだ時点で縮小して送り始める（本文を書いている間に送り終える）。外した写真は
  `DELETE /api/quickpost/photo?id=` で消し（投稿待ちのさっと投稿の写真だけ）、投稿に使われないまま 24 時間たった写真は
  写真を送ったあとに片付ける（`cleanupStalePhotos`）
- **送信待ち（バックグラウンド送信）**: 「投稿する」を押したら端末の IndexedDB（`mk_post`）に本文と縮小した写真を保存し、
  すぐ次を書ける。送信は押した順に1件ずつで、様子はヘッダーの下の帯に出す（`useOutbox`・決まりごとは `src/lib/quickpost/outbox.ts`）。
  通信の失敗などは 5秒〜5分の間隔で自動で送り直し、電波が戻った・画面に戻ったときはすぐ送る。ログインが切れたら止め、ログインし直すと続きから。
  内容の誤りは「直す」で入力欄に戻す。iPhone の Safari は閉じたあとに送り続ける仕組み（Background Sync）に対応していないため、
  閉じている間は止まり、次に開いたときに続きから送る。複数のタブでは Web Locks で送るのを1つのタブにする。
  ログアウトしても送信待ちはこの端末に残り、次にログインしたときに送る（帯に「ログインすると、送りかけの投稿を続きから送ります」と出る）。
  投稿待ちの写真は、管理画面のほかの画像の欄（制作物・イベント・プロフィール）では選べない（24 時間で片付けられるため）
- **二重投稿**: 下書きごとの UUID で受付票（`quickpost-nonces`・一意）を取り、再送・二度押し・送り直しでも1件。
  同じ受付番号で内容がちがっていたら（応答が届かないまま直した など）、送らずに「別の投稿として送る」かを確かめる
- **画面**: `noindex`・`no-store`・nonce つき CSP（`src/middleware.ts`）・埋め込み禁止

API: `GET /api/quickpost/session` / `POST /api/quickpost/{login,register}/{options,verify}` /
`POST /api/quickpost/photo` / `DELETE /api/quickpost/photo?id=` / `POST /api/quickpost/posts` / `POST /api/quickpost/logout`

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
