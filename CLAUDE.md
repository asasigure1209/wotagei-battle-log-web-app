# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ヲタ芸バトルのイベント動画を、プレイヤーごとに見られ・ダウンロードできるようにする Nuxt 4 アプリ。本番は Vercel、DB は Cloudflare D1、動画は Cloudflare R2。設定・運用手順の詳細は README.md と docs/production-db.md にある。

## コマンド

ツールのバージョンは `mise.toml` (bun・Node.js)。パッケージ管理と実行は bun。

```bash
bun run dev                      # http://localhost:3000
bunx biome check                 # lint + 整形の確認 (CI は bunx biome ci)
bunx biome check --write         # 自動修正
bun run test                     # vitest の全プロジェクト (nuxt / server / storybook)
bunx vitest run --project server                       # プロジェクトを絞る
bunx vitest run test/server/manifest.spec.ts           # 1 ファイルだけ
bunx vitest run test/nuxt/id.spec.ts -t 'テスト名'      # 1 テストだけ
bun run storybook                # http://localhost:6006

bun run db:migrate && bun run db:seed        # ローカル SQLite (.data/db.sqlite) を作ってサンプルを入れる
bun run db:generate --name <変更内容>         # server/db/schema.ts を変えたらマイグレーション生成
bun run db:import <yaml> [--dry-run]         # manifest YAML でイベントを取り込む
```

- storybook プロジェクトのテストは Playwright の chromium を使う (`bunx playwright install chromium`)。
- lefthook の pre-commit で、ステージしたファイルに `biome check --write` がかかる。
- Biome の `noExcessiveCognitiveComplexity` は **上限 5** (`biome.json`)。関数は小さく分ける。
- コードスタイル: シングルクォート、セミコロンなし、スペースインデント。

## アーキテクチャ

### DB 接続 (`server/db/client.ts`)

Vercel から D1 に直接つなげないため、SQL を中継 Worker (`workers/d1-proxy`、`/query` と `/batch` を受ける) に送り、Worker が D1 で実行する。`NUXT_D1_PROXY_URL` が未設定ならローカルの SQLite を libsql で開く。どちらも Drizzle の `sqlite-proxy` として見えるので、上のコードは接続先を意識しない。drizzle-kit・seed・import・サーバー・テストがすべてこの 1 か所の接続を使う。サーバーからは `server/utils/db.ts` の `useDb()` (1 度だけ接続して使い回す) を通す。

- スキーマ (`server/db/schema.ts`) は URL の ID (series・event) とエントリー No. を組み合わせた複合主キーで、すべて親の削除で CASCADE する。ローカル SQLite では `PRAGMA foreign_keys = ON` を接続ごとに打っている。
- 本番のマイグレーションは `vercel-build` で `nuxt build` の前に流れる。古いコードが新スキーマで動く時間があるので、列の削除・リネームはデプロイを 2 回に分ける。

### manifest が取り込みの共通形式 (`server/db/manifest.ts`)

イベント 1 つ分 (シリーズ・イベント・エントリー・動画のキー/長さ/サイズ・出演者) を表す形。`parseManifest` で検証し (誤りは `ManifestError.problems` にまとめて返す)、`importManifest` でそのイベントの分を 1 回のバッチで入れ直す。CLI の `db:import` も、管理画面の登録 (`server/api/admin/events/index.post.ts`) も同じ関数を使う。管理画面の登録は、加えて R2 に同じサイズの動画があるかを確かめる。`server/utils/admin-repository.ts` は登録済みイベントを manifest の形で返し、画面で手直しして登録し直せるようにしている。公開画面向けの整形は `server/utils/repository.ts`。

### 2 種類の API 認証 (`server/middleware/`)

- `/api/**` (公開画面用): ブラウザからは呼ばせず、SSR からだけ呼ぶ。`api-auth.ts` が `x-api-secret` ヘッダーを `runtimeConfig.apiSecret` と比べる。画面からは `app/composables/useApiFetch.ts` を使う (サーバー側でだけヘッダーを載せ、クライアントのビルドからは消える)。
- `/api/admin/**` (管理画面用): ブラウザから呼ぶので api-secret は見ず、`admin-auth.ts` が `NUXT_ADMIN_PASSWORD` で署名した Cookie を確かめる (`server/utils/admin-session.ts`)。
- runtimeConfig の合言葉は数字だけだと数値になるので、必ず `configSecret()` (`server/utils/api-secret.ts`) で文字列にしてから使う。

### 動画と R2 (`server/utils/r2.ts`、aws4fetch)

- ダウンロード: `/download/<series>/<event>/players/<no>/<video>` (`server/routes/`) が DB でキーを引き、R2 の署名付き URL (10 分) にリダイレクト。動画はアプリを通らない。
- アップロード: Vercel の関数は本文 4.5MB までなので、ブラウザから R2 にマルチパートで直接 PUT する。サーバー (`server/api/admin/uploads/`) は開始・パートの署名付き URL・完了・中止だけ。読み出し用と書き込み用で R2 トークンが別 (`r2UploadConfig`)。
- 動画のキーは `<シリーズID>/<イベントID>/<相対パス>.mp4`。検証は `shared/utils/video-key.ts`・`shared/utils/id.ts` (クライアントとサーバーで共用)。

### キャッシュ (`nuxt.config.ts` の `routeRules`)

イベント・プレイヤー画面は Vercel の ISR で 1 時間 (404 も)、`allowQuery: []`。`/admin` は `ssr: false, isr: false` が必須 (外すと `/:series/:event` に当たって Vercel で 404 になる。headers も付けない)。`payloadExtraction: false` で payload を HTML に埋め込んだまま。画面に署名付き URL を載せず `/download/**` へのリンクだけにしているのは、ISR でとっておいても期限切れにしないため。

### 管理画面のフロント (`app/pages/admin.vue`)

状態とロジックは `app/utils/adminEditor/` (state・rows・upload・registration を `editor.ts` が束ねる) にあり、Nuxt の自動 import 対象外の階層に置いている。画面は `app/composables/useAdminEditor.ts` の provide/inject で使い、テストと Storybook は `createAdminEditor` を直接作る。API 呼び出しは `app/utils/adminApi.ts`、マルチパート送信は `app/utils/multipartUpload.ts`、MP4 の長さは `app/utils/mp4Duration.ts` (moov を読む)。

## テスト

`vitest.config.ts` に 3 プロジェクト:

- `nuxt` (`test/nuxt/`): Nuxt 環境。管理 API の偽物は `test/nuxt/adminTestUtils.ts` (`registerEndpoint`)。
- `server` (`test/server/`): node 環境で `.data/test.sqlite` に対して実行。全ファイルが同じ DB を使うので `fileParallelism: false`。各テストは `test/server/test-db.ts` の `resetTestDb()` で空にする。node 環境で読めるよう、`server/utils/` の中では Nitro の自動 import に頼らず明示的に import する (新しく書くときもそうする)。
- `storybook`: `app/**/*.stories.ts` を Playwright の chromium で実行。Chromatic にも push ごとに上がる。

## 書き方の慣習

コメント・コミットメッセージ・ドキュメントは日本語で、「なぜそうしているか」をやさしい言葉で書いている (既存のコメントの文体に合わせる)。README の手順や環境変数の表は、挙動を変えたら合わせて直す。
