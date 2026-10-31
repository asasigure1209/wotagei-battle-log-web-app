# wotagei-battle-log-web-app

Nuxt で作った Web アプリです。Nuxt について詳しくは [Nuxt のドキュメント](https://nuxt.com/docs/getting-started/introduction) を参照してください。

## セットアップ

bun と Node.js のバージョンは `mise.toml` で決めています。[mise](https://mise.jdx.dev/) で入れてから、依存パッケージをインストールします。

```bash
mise install
bun install
```

## 開発サーバー

`http://localhost:3000` で開発サーバーを起動します。

```bash
bun run dev
```

## 静的チェック

lint と整形は Biome で行います。関数の認知的複雑度 (`noExcessiveCognitiveComplexity`) が 15 を超えるとエラーになり、PR の `lint` ジョブが落ちます。

```bash
bunx biome check
```

## データベース

スキーマは `server/db/schema.ts` にあります (Drizzle ORM、SQLite)。本番のデータベースは Cloudflare D1 です。アプリは Vercel で動いていて D1 に直接バインドできないため、SQL を小さなプロキシ Worker (`workers/d1-proxy`) に送り、Worker が D1 で実行します。

| 環境変数              | 意味                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `NUXT_D1_PROXY_URL`   | プロキシ Worker の URL。設定されていると、アプリはこの Worker を通して D1 を使う                                                         |
| `NUXT_D1_PROXY_TOKEN` | Worker の `PROXY_TOKEN` と同じ値にする                                                                                                   |
| `NUXT_API_SECRET`     | API (`/api/**`) をこのアプリのサーバーからの呼び出しだけに限るための合言葉。未設定ならビルドごと (dev では起動ごと) にランダムな値になる |
| `NUXT_DATABASE_URL`   | `NUXT_D1_PROXY_URL` が未設定のときに使うローカルの SQLite ファイル (既定値 `file:.data/db.sqlite`)                                       |

### ローカル開発

```bash
# ローカルの DB を作り、サンプルデータを入れる
bun run db:migrate
bun run db:seed

# server/db/schema.ts を変更したら、マイグレーションを生成する
bun run db:generate --name <変更内容>
```

D1 の構成をローカルで試すには、ローカルの D1 に対してプロキシ Worker を動かします。

```bash
echo 'PROXY_TOKEN=local-proxy-token' > workers/d1-proxy/.dev.vars
bun run d1:migrate:local
bun run d1-proxy:dev   # http://localhost:8787

export NUXT_D1_PROXY_URL=http://localhost:8787 NUXT_D1_PROXY_TOKEN=local-proxy-token
bun run db:seed --allow-d1-proxy
bun run dev
```

`db:seed` は `server/db/seed.yaml` のサンプルイベントを取り込みます。サンプルが本番に入ってしまわないよう、`--allow-d1-proxy` を付けない限りプロキシ Worker 経由では実行を拒否します。本番の Worker を向いているときは決して付けないでください。

### イベントの取り込み

イベントごとのデータは 1 つの YAML ファイル (manifest) です。動画アップローダーのリポジトリ (wotagei-battle-log-video-uploader) の `mise manifest --series <シリーズID> --event <イベントID>` で、各動画のキー・長さ・サイズが入ったひな形が書き出されます。シリーズ名、イベント、エントリー、各動画の出演者を埋めてから取り込みます。

```bash
bun run db:import <yaml> --dry-run   # ファイルを検査し、取り込まれる内容を表示するだけ
bun run db:import <yaml>             # 取り込む
```

取り込み先はアプリと同じ環境変数に従います。`NUXT_D1_PROXY_URL` / `NUXT_D1_PROXY_TOKEN` が本番の Worker を指していれば本番に、そうでなければローカルの SQLite ファイルに取り込まれます。取り込むとそのイベントのエントリー・動画・出演者が置き換えられ、他のイベントには影響しません。すべてを 1 回のバッチで送るため、取り込みに失敗した場合は何も変更されません。ファイルの誤り (空欄、`performers` にある存在しないエントリー No.、重複したキーなど) は、何かを書き込む前にすべて一覧表示されます。

### 本番 (初回)

```bash
bunx wrangler login
bunx wrangler d1 create wotagei-battle-log   # 表示された database_id を workers/d1-proxy/wrangler.toml に書く
bun run d1:migrate:remote
bunx wrangler secret put PROXY_TOKEN -c workers/d1-proxy/wrangler.toml   # 長いランダムな値
bun run d1-proxy:deploy
```

そのあと、Vercel プロジェクトの環境変数に `NUXT_D1_PROXY_URL` (デプロイした Worker の URL)、`NUXT_D1_PROXY_TOKEN` (`PROXY_TOKEN` と同じ値)、`NUXT_API_SECRET` (長いランダムな値) を設定します。

さらに、本番デプロイでマイグレーションを流せるよう、Vercel の Production 環境にだけ次の環境変数を設定します。

| 環境変数                | 意味                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare の API トークン。権限は Account → D1 → Edit だけでよい |
| `CLOUDFLARE_ACCOUNT_ID` | D1 があるアカウントの ID                                          |

### マイグレーションの適用

Vercel の本番ビルド (`bun run vercel-build`) は、`nuxt build` の前に `bun run d1:migrate:remote` を実行し、未適用のマイグレーションを本番の D1 に流します。失敗するとビルドごと失敗し、デプロイされません。Preview デプロイでは実行しません。

マイグレーションはビルド中、つまり新しい版に切り替わる前に適用されるので、切り替わるまでの間は古いコードが新しいスキーマで動きます。マイグレーションのあとに `nuxt build` が失敗したときや、Vercel の Instant Rollback で前の版に戻したときも、スキーマは新しいまま残ります。列の削除やリネームのように古いコードを壊す変更は、コード側で使うのをやめるデプロイと、スキーマを変えるデプロイの 2 回に分けてください。

## 本番

本番用にアプリケーションをビルドし、ローカルでプレビューします。

```bash
bun run build
bun run preview
```

詳しくは [デプロイのドキュメント](https://nuxt.com/docs/getting-started/deployment) を参照してください。
