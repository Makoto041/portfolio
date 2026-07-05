# Handoff: ライフログサイト・リデザイン「ミスト・ターミナル」

iwabuchi-makoto.com のトップページ(Timeline メイン)リデザイン実装依頼パッケージ。

> **既に初版を実装済みの方へ**: 初版ハンドオフからの変更点だけを `CHANGELOG.md` にまとめてあります。差分改修はそちらを参照してください(このREADMEは現行の完全仕様)。

## Overview

個人ライフログサイトのトップページを「ライトターミナル」テイストに刷新する。
コンセプト: **群青×ミストの透明感 × ターミナル/git log のメタファー**。
Timeline(気軽な日記投稿)が主役。Gallery・Posts・Profile などの既存セクションは右レール+写真ストリームで露出させる。

- ロゴ「MAKOTO(アウトライン)+ IWABUCHI(ベタ)」はヘッダーに常駐。ページ本体は**コンテンツ(Timeline)最優先**
- 現行サイトにある **現在地・天気・日時のライブ表示機能は踏襲**(ステータスバー右側に統合)

## About the Design Files

このバンドル内のファイルは **HTMLで作られたデザインリファレンス** です。プロトタイプとして「見た目と挙動」を示すものであり、そのまま本番コードとして流用するものではありません。

タスクは、このHTMLデザインを **対象コードベースの既存環境で再現すること** です。対象サイトは **Payload CMS × Next.js** で構築されているため、既存の Next.js のパターン(App Router / コンポーネント構成 / データ取得)と Payload のコレクション構造に沿って実装してください。CSSは既存の手法(CSS Modules / Tailwind 等、リポジトリの慣習)に合わせて移植すること。

## Fidelity

**High-fidelity (hifi)**。色・タイポグラフィ・余白・インタラクションは最終意匠。既存ライブラリ/パターンを使いつつ、ピクセル基準で再現してください。
ただし写真・アバターはすべて **斜線ストライプのプレースホルダー**(実装では Payload の実データに差し替え)。

## Screens / Views

### トップページ(= Timeline)

レイアウト: **ブラウザ横幅いっぱいのフルブリード**(中央寄せの固定幅ではない)。コンテンツ左右パディング 48px を保ったまま画面幅に合わせて伸縮する。メイングリッドは `1fr 320px`(右レール320px固定・左可変)。ベース背景 `#eef1f4`。最小幅は 1080px 程度を目安(ナビ・バーの折り返し防止)。
背景に2つの「ミストブロブ」(半透明の放射グラデ円、blur 60-65px)が 24s/28s でゆっくり漂う。

上から:

1. **ウィンドウタイトルバー** (`position: static`、背景 `rgba(255,255,255,.55)` + `backdrop-filter: blur(14px)`、下罫線 hairline)
   - 左: macOS風ドット3つ(11px円、ミスト色濃淡、1px縁)
   - ターミナルパス `makoto@tokyo: ~/life — {ライブ時刻}` (11px, sub色, nowrap)。名前は下記ヒーローの大型ワードマークが担うため、ヘッダーにロゴは置かない
   - 右: ナビ `./timeline ./posts ./gallery ./events ./products ./profile ./letter`
     - 11.5px mono、パディング 6px 13px、角丸なし
     - 現在ページ&hover: 背景 ink・文字白(transition all .2s)
2. **ヒーロー**(padding 28px 48px 0)— コンテンツの顔。上から `~/life $ whoami`(12.5px) → **大型ワードマーク**(`MAKOTO` 108px アウトライン stroke 1.5px / `IWABUCHI` 108px inkベタ + 点滅ブロックカーソル 44×80px) → タグライン。
   - **ワードマークとタグラインは初期ロードでタイプライター表示**(下記モーション参照)
   - タグライン `日々の記録、ときどき写真。つぶやきくらいの気軽さで。`(Noto Sans JP 12.5px)と `— web engineer, tokyo`(11px)は **Payload CMS 編集可能フィールド**
3. **ステータス/ライブ環境バー**(ヒーロー直下、margin-top 26px の1行パネル。草グリッドは廃止)
   - パネル: 半透明白(`.65`)+ blur12 + hairline枠、padding 9px 18px、11.5px、gap 16px
   - 左(ローテーションスロット): スピナー + `NOTICE` + 日付バッジ + `{メッセージ}` — `NOTICE`ラベルは固定、**日付・メッセージは項目ごとに切替**(下記モーション参照。スロットは min-width 290px)
   - 縦罵線で区切り、その右に `entries: 128` `photos: 342` `streak: 47d` を**常時並列表示**(ローテーションしない)
   - 右寄せ(ライブ環境・現行機能の踏襲、**固定表示**): **天気SVGアイコン(24px)** / 気温(Outfit 700 14px) / `くもり · 東京`(Noto Sans JP) / `|` / 日付 `YYYY.MM.DD DAY` / 時刻 `HH:MM`(Outfit 700 14-15px, tabular-nums。**秒なし・アニメなし**)
   - 詳細は「Interactions & Behavior > ライブ環境情報」参照
4. **メイングリッド** `grid-template-columns: 1fr 320px; gap: 36px`(padding-top 32px)
   - **左: git log 風タイムライン**
     - ヘッダ行: `~/life $ git log --diary --photos` + フィルタチップ `--all --diary --photo --build`(10.5px、1px枠、選択&hoverで ink反転)
     - コミット列: 左に `2px solid oklch(0.8 0.03 265)` の縦罫、各エントリに丸ノード(12px)。最新は accent-dot塗り+グロー、`HEAD` バッジ(ink地・白字10px)
     - エントリ構造: メタ行(11.5px: ハッシュチップ + `YYYY-MM-DD day HH:MM` + カテゴリ) → 本文(Noto Sans JP 600 / 16px / line-height 1.8) → `♡ n`(11px)
     - ハッシュチップ: `oklch(0.45 0.09 268)` 文字 / 背景 `oklch(0.92 0.02 262 / .8)` / padding 2px 8px
     - 写真付きエントリ: flex行 gap10px、大 flex1.5 + 小 flex1、高さ180px、白1px縁、hoverで `brightness(.94)`
     - エントリ区切り: `1px dashed` hairline。行hover: 背景 `rgba(255,255,255,.6)`
     - 末尾: `$ load --more (all 128)` ボタン(1px ink枠 → hover ink反転)
   - **右レール**(`position: sticky; top: 16px`、カード3枚。カード= 半透明白 `.68` + blur14 + hairline枠、padding 20px 22px)
     - `$ cat profile.txt`: アバター54px角 + 名前(Noto Sans JP 700 14px)+ role、bio 11.5px/1.9、SNSリンク `x ↗ instagram ↗ github ↗`(枠チップ → hover ink反転)
     - `$ ls ./gallery`: `342 files →` リンク、2列グリッド(gap 8px) — 横長1枚(2col・120px)+ 正方形1枚 + `+340` タイル(ink地白字 → hover 明るい ink)
     - `$ ls ./more`: `posts/ events/ products/ letter/` 行リスト(dashed罫、hoverで文字ink+左に6pxインデント)
5. **ギャラリーストリーム** `~/life $ open ./gallery --stream`
   - 全幅マーキー: 260×170px の写真が gap 10px で**左へ42s/linear/無限**に流れる(内容2セット複製で `translateX(-50%)` ループ)
   - 各写真の左下にファイル名チップ `img_001 — 那須`(9.5px、白85%地)
   - 左右エッジに 80px の背景色フェード
6. **フッター**: 上罫線 hairline、`© 2026 makoto iwabuchi — slowly, but daily.`(斜体部はセリフ) / 右端 `$ exit 0`

## Interactions & Behavior

- **hover反転**: ナビ/フィルタ/ボタン/SNSチップ — `transition: all .2s` で ink地+白文字に
- **コミット行hover**: 背景 `rgba(255,255,255,.6)`(.2s)
- **写真hover**: `filter: brightness(.94)`(.25s)
- **点滅カーソル**: `steps(2)` 1.3s 無限
- **点滅ドット**: opacity .5↔1、1.6〜2.2s ease-in-out
- **マーキー**: 42s linear infinite。`prefers-reduced-motion: reduce` で停止(ブロブ・点滅も停止)
- **登場アニメ**: ヒーロー要素は `fadeup`(24px下から、.6-.7s、stagger)
- **ワードマーク+タグラインのタイプライター(初期ロード)**: 読み込み後約300msで開始→ `MAKOTO` → `IWABUCHI` の順に90ms/字でタイプ(ブロックカーソルが行末に、MAKOTO完了で下段へ移動)→ 約260ms後にタグライン本文を70ms/字でタイプ(末尾にカーソル)→ 完了で `— web engineer, tokyo` をフェードイン。`prefers-reduced-motion` では全文即表示
  - **レイアウトシフト防止**: 名前2行に `min-height`(`.95em`/`.98em`)、タグライン行に `min-height:20px` を与え、タイプ前の空状態でも高さを確保。ヒーロー総高さは一定(208px)で下の要素が動かない(CLS=0)
- **NOTICEのローテーション(日付+コメント付き。entries/photos/streakは対象外で常時表示)**:
  - ブライユ・スピナー `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏`(10フレーム、90ms間隔、accent色、幅固定13px)が常時回転
  - `NOTICE` ラベルは固定(「お知らせ」の意)。直後に **日付バッジ**(例 `12.06`、Outfit 600 10.5px、accent色)、その後に**メッセージ本文**(Noto Sans JP)
  - 項目例: `12.06 アドベントカレンダー執筆中です` / `11.28 年末の振り返り記事を準備中` / `11.20 ギャラリーに写真を50枚追加しました` / `11.12 コメント欄からのお便り、読んでます`
  - メッセージ部分のみ75ms/字でタイプ → 約2秒ホールド → 次の日付+メッセージへ(日付は即時切替、メッセージはクリアして再タイプ)。末尾に点滅カーソル 6×12px・steps(2) 1.1s
  - 実装では Payload のお知らせコレクション(date + body)を新しい順にローテーション
  - entries/photos/streak は隣接する縦罵線の右に**常時並表示**(実データ)。こちらはアニメーションなし
  - `prefers-reduced-motion` では静止(スピナーは●固定、NOTICEは先頭の日付+メッセージを固定表示)
- **ミストブロブ**: `blobdrift` 24s / `blobdrift2` 28s(keyframes はリファレンスHTML参照)

### ライブ環境情報(現行サイト機能の踏襲)

- **時計**: 表示 `YYYY.MM.DD DAY` + `HH:MM`(**秒なし・固定的な見た目**。内部的には30s間隔程度で更新して分を追従)。タイトルバーの時刻も同期
- **位置**: `navigator.geolocation.getCurrentPosition`(timeout 5s)。拒否/失敗/6s無応答 → **東京(35.6812, 139.7671)にフォールバック**し、表示名「東京」
- **逆ジオコーディング**: `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=&longitude=&localityLanguage=ja` → `city || locality || principalSubdivision`
- **天気**: `https://api.open-meteo.com/v1/forecast?latitude=&longitude=&current=temperature_2m,weather_code`(APIキー不要)
  - 気温: 四捨五入 + `°C`。取得前は `--°`
  - weather_code → ラベル: 0=快晴 / ≤2=晴れ / 3=くもり / ≤48=霧 / ≤57=霧雨 / ≤67=雨 / ≤77=雪 / ≤82=にわか雨 / ≤86=雪 / else=雷雨
  - weather_code → アイコン種別: sun / partly / cloud / fog / rain / snow / thunder
- **天気アイコンはSVG(線画)**: 24px表示 / viewBox 64 / stroke currentColor / stroke-width 3.4 / round cap&join。晴れは**光線グループが28sでゆっくり回転**。全アイコンのパスはリファレンスHTML内 `wxIcon()` に完備
- Next.js実装時はクライアントコンポーネント化(`'use client'`)。APIは直fetchでよいが、必要ならRoute Handler経由でキャッシュ可

## State Management

- `now: Date` — 30sごと更新(秒は表示しない。unmount時にclearInterval)
- `nameTyped(0-14) / tagTyped` — ワードマーク→タグラインの逐次タイプ用。タグライン本文・ロール(`— web engineer, tokyo`)は **Payload 編集可能フィールド**として実装
- `rotIdx / typed / hold` — NOTICEメッセージのローテーション用(75msティック1本でタイプ→ホールド→次へ)。entries/photos/streakはローテーション対象外(定数表示)
- `place: string` — '取得中…' → 逆ジオ結果 or '東京'
- `weather: { temp, label, kind }` — mount時に1回取得(+位置確定時)
- タイムライン: Payload の entries コレクションから新しい順。`load --more` はページネーション(現行の挙動に合わせる)
- フィルタチップ: category での絞り込み(all/diary/photo/build ≒ 現行カテゴリにマップ)

## Design Tokens

色(oklchのまま実装可。hex近似は括弧内):

- bg: `#eef1f4`
- ink(主文字・ベタ面): `oklch(0.30 0.08 272)`(≈ #232b52)
- ink-soft(準アクセント): `oklch(0.45 0.07 268 / .8)`
- sub(プロンプト・補助): `oklch(0.50 0.04-0.06 268)`
- faint(メタ): `oklch(0.55 0.04 268)`
- hairline(罫線): `oklch(0.85 0.02 262)` / 濃いめ `oklch(0.84 0.02 262)`
- accent-dot(カーソル/ドット/HEADノード): `oklch(0.55 0.09 268)`
- パネル: `rgba(255,255,255,.55/.65/.68)` + `backdrop-filter: blur(12-14px)`
- ハッシュチップ地: `oklch(0.92 0.02 262 / .8)`
- ミスト: `oklch(0.90 0.03 255 / .6)` / `oklch(0.91 0.025 285 / .5)`
- 写真プレースホルダー(実装では実写真): 45°ストライプ、青系 `oklch(0.88 0.03 255)` / 紫系 `oklch(0.90 0.02 285)` / 水色系 `oklch(0.90 0.02 230)`
- **原色・黄色は使わない**

タイポグラフィ:

- 英字/数字/UI: **Outfit**(400-700) — ロゴ 20px/700(MAKOTO=アウトライン stroke 1.2px、IWABUCHI=ベタ)、時刻 15px/700/tabular-nums、日付見出し等 600
- 地の文(日本語): **Noto Sans JP** — エントリ本文 16px/600/1.8、bio 11.5px/1.9
- モノスペース(プロンプト・メタ・ナビ): **IBM Plex Mono** — 10.5〜12.5px
- 斜体の添え(フッター): Georgia italic

スペーシング/その他:

- コンテンツ左右 48px(フルブリード・画面幅に伸縮)、セクション間 44-52px
- 角丸: **基本なし(0)**。円形要素(ドット/ノード/アバター以外の丸)のみ 50%
- 影: 基本なし(ライブバーも影なし)。パネルは罫線+半透明で層を表現

## Assets

- 写真・アバターは全てプレースホルダー(斜線ストライプ)。実装では Payload の Media から取得
- 天気アイコンSVG: リファレンスHTML内 `wxIcon()` にインラインで完備(外部アセット不要)
- フォント: Google Fonts(Outfit / Noto Sans JP / IBM Plex Mono)。セルフホスト推奨

## Files

- `design-reference-top.html` — トップページ(Timeline)のhifiリファレンス。ブラウザで直接開けます。ライブ時計・天気・SVGアイコン・マーキー・hover等すべて動作します
