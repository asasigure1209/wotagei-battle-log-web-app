# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ヲタ芸バトルのイベント動画を見る・ダウンロードする Nuxt 4 アプリ。本番は Vercel + Cloudflare D1 (DB) + R2 (動画)。運用手順は README.md と docs/production-db.md。

## コマンド

```bash
bun run dev
bunx biome check [--write]                       # CI は bunx biome ci
bun run test                                     # nuxt / server / storybook の 3 プロジェクト
bunx vitest run --project server                 # プロジェクトを絞る
bunx vitest run <file> -t '<テスト名>'            # 1 テストだけ
bun run db:migrate && bun run db:seed            # ローカル SQLite (.data/db.sqlite)
bun run db:generate --name <変更内容>             # schema.ts を変えたら
bun run db:import <yaml> [--dry-run]
```

Biome の `noExcessiveCognitiveComplexity` は上限 5。

## 進め方

- 実装は TDD で進める
- モジュールの責務は 1 つに保ち、大きくなる前に分ける。既存の分け方に合わせる:
  - `server/api/**` のハンドラは薄くし、DB・R2・検証は `server/utils/` に置く
  - 公開画面用と管理画面用で返す形が違うものは分ける (`repository.ts` / `admin-repository.ts`)
  - 画面の状態とロジックは `app/utils/` に出す。大きいものは `app/utils/adminEditor/` のように関心ごとに分け、束ねる役を置く
  - クライアントとサーバーで共用する検証は `shared/utils/`

## アーキテクチャ

- **DB 接続** (`server/db/client.ts`): Vercel から D1 に直接つなげないので、中継 Worker (`workers/d1-proxy`) に SQL を送る。`NUXT_D1_PROXY_URL` が未設定ならローカル SQLite (libsql)。どちらも Drizzle の `sqlite-proxy` で、CLI・サーバー・テストがすべてここを使う。サーバーからは `useDb()`
- **manifest** (`server/db/manifest.ts`): イベント 1 つ分のデータ形式。`db:import` と管理画面の登録 (`server/api/admin/events/index.post.ts`) が同じ `parseManifest` / `importManifest` を使い、そのイベントの分を 1 バッチで入れ直す
- **認証** (`server/middleware/`): `/api/**` は SSR からだけ呼ぶ前提で `x-api-secret` を確かめる (画面からは `useApiFetch`)。`/api/admin/**` はブラウザから呼ぶので、管理パスワードで署名した Cookie を確かめる。runtimeConfig の合言葉は数値になりうるので `configSecret()` で文字列にする
- **R2** (`server/utils/r2.ts`): ダウンロードは `/download/**` から署名付き URL へリダイレクト。アップロードは Vercel の本文 4.5MB 制限のため、ブラウザから R2 へマルチパートで直接送る。読み出し用と書き込み用でトークンが別
- **キャッシュ** (`nuxt.config.ts`): イベント・プレイヤー画面は ISR 1 時間。`/admin` の `isr: false` は外すと Vercel で 404 になる (headers も付けない)
- **マイグレーション**: 本番ビルド (`vercel-build`) で `nuxt build` の前に流れる。列の削除・リネームはデプロイを 2 回に分ける

## テスト

- `test/nuxt/`: Nuxt 環境。管理 API の偽物は `adminTestUtils.ts`
- `test/server/`: node 環境で `.data/test.sqlite` を共有するので直列実行。`resetTestDb()` で空にする。`server/utils/` では Nitro の自動 import に頼らず明示的に import する
- `*.stories.ts`: Playwright (chromium) で実行。操作は play 関数で確かめる

## 慣習

コメント・コミットメッセージ・ドキュメントは日本語。挙動を変えたら README も直す。
