# LINE から Timeline へ投稿する機能 — セットアップ手順（Issue #35）

LINE のトーク画面にテキストを送ると、サイトの **Timeline** に投稿され、投稿確認がリッチメッセージ（Flex）で返ってくる機能です。投稿できるのは**自分の LINE アカウントのみ**（userId ホワイトリスト）。

コード側（webhook・投稿処理・確認メッセージ）は実装済みです。**動かすには以下のユーザー操作が必要**です。

---

## 🧑‍💻 あなたの実施が必要な作業

### 1. LINE Messaging API チャネルを用意
[LINE Developers コンソール](https://developers.line.biz/console/) で、Messaging API チャネルを作成（既存の Bot を流用してもよい）。

- **チャネルシークレット**（Basic settings）→ `LINE_CHANNEL_SECRET`
- **チャネルアクセストークン（long-lived）**（Messaging API タブで発行）→ `LINE_CHANNEL_ACCESS_TOKEN`
- 応答設定: **「応答メッセージ」を OFF**、**「Webhook」を ON** にする

### 2. 自分の LINE userId を調べる → `LINE_ALLOWED_USER_ID`
userId は「Uxxxxxxxx…」の形式（LINE の表示名や ID とは別物）。取得方法の例:
- 一旦 `LINE_ALLOWED_USER_ID` を仮値にしてデプロイ → 自分から Bot にメッセージを送る → Vercel の Functions ログ、または webhook のイベント `source.userId` を確認して控える
- もしくは LINE Developers の Webhook イベントログ / 既存 bot のログから確認
- 判明したら正しい userId を `LINE_ALLOWED_USER_ID` に設定（カンマ区切りで複数可）

### 3. Vercel に環境変数を設定
Vercel プロジェクト → Settings → Environment Variables に3つ追加（Production）:

| 変数 | 値 |
|---|---|
| `LINE_CHANNEL_SECRET` | チャネルシークレット |
| `LINE_CHANNEL_ACCESS_TOKEN` | チャネルアクセストークン |
| `LINE_ALLOWED_USER_ID` | 自分の userId（`Uxxxx…`） |

設定後、再デプロイ（環境変数反映のため）。

### 4. Webhook URL を登録
LINE Developers → Messaging API → **Webhook URL** に以下を設定し「検証（Verify）」で 200 を確認:

```
https://iwabuchi-makoto.com/api/line/webhook
```

「Webhook の利用」を ON にする。

### 5. 動作確認
自分の LINE から Bot にテキストを送る → Timeline に投稿され、「✅ 投稿しました」の Flex が返れば成功。反映は ISR のため `/` と `/timeline` を再検証済み（数秒で反映）。

---

## 仕様・挙動メモ

- **セキュリティ**: `x-line-signature`（HMAC-SHA256）で真正性を検証し、さらに送信者 userId をホワイトリストで限定。両方を満たさないリクエストは投稿されない（署名不一致は 401、ホワイトリスト外は拒否メッセージを返信）。
- **投稿内容**: メッセージ本文をそのまま Timeline の本文（richText）に。改行は段落として保持。投稿タイプは既定で「日記(diary)」。
- **確認メッセージ**: 本文プレビュー＋「タイムラインを見る」ボタン付きの Flex を必ず返信。
- **現時点の制限（今後の拡張候補）**:
  - **テキストのみ対応**。画像投稿は未対応（LINE の画像を取得 → media にアップロード → 添付、という追加実装が必要）。
  - 投稿タイプの指定なし（常に diary）。先頭に `#tech` 等のコマンドで切り替える拡張が可能。
- **環境変数が未設定の場合**: webhook は 500 を返し投稿しない（安全側）。

## 関連

- 実装: `src/app/api/line/webhook/route.ts` / `src/lib/line.ts`
- Timeline コレクション: `src/collections/TimelinePosts.ts`
- Issue: #35
