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

ふだんは [管理画面](#管理画面-動画のアップロードとイベントの登録) で登録します。コマンドで取り込むときは、イベントごとのデータを 1 つの YAML ファイル (manifest) に書きます。形は `server/db/seed.yaml` (シリーズ・イベント・エントリー・各動画のキー・長さ・サイズ・出演者) と同じです。

各動画の `durationSec` (長さ。秒に四捨五入) と `sizeBytes` (バイト数) は、R2 に置いたファイルと同じものを手元で調べて書きます。サイズが R2 のものと違うと、管理画面の登録の前の確認で止まります (`db:import` は R2 を見ないので、そのまま入ってしまう)。

```bash
stat -f %z 予選/M1256.mp4   # サイズ (macOS。Linux は stat -c %s)
ffprobe -v error -show_entries format=duration -of csv=p=0 予選/M1256.mp4   # 長さ (秒。ffmpeg に入っている)
```

```bash
bun run db:import <yaml> --dry-run   # ファイルを検査し、取り込まれる内容を表示するだけ
bun run db:import <yaml>             # 取り込む
```

本番のイベント・プレイヤーの画面は Vercel の ISR で 1 時間とっておきます (`nuxt.config.ts` の `routeRules`。署名付き URL に転送する `/download/**` と `/api/**` はとっておきません)。そのため本番に取り込んでも、画面に出るまで最大 1 時間かかります。404 もとっておかれるので、取り込む前に開かれた画面も最大 1 時間 404 のままです。とっておいた画面はデプロイごとに別なので、すぐに出したいときは取り込んだあとに再デプロイしてください (Vercel のダッシュボードで本番のデプロイを Redeploy すれば、コードを変えなくてよい)。Instant Rollback で前のデプロイに戻すと、そのデプロイがとっておいた古い画面が出ることがあります。

取り込み先はアプリと同じ環境変数に従います。`NUXT_D1_PROXY_URL` / `NUXT_D1_PROXY_TOKEN` が本番の Worker を指していれば本番に、そうでなければローカルの SQLite ファイルに取り込まれます。取り込むとそのイベントのエントリー・動画・出演者が置き換えられ、他のイベントには影響しません。すべてを 1 回のバッチで送るため、取り込みに失敗した場合は何も変更されません。ファイルの誤り (空欄、`performers` にある存在しないエントリー No.、重複したキーなど) は、何かを書き込む前にすべて一覧表示されます。

本番の DB に取り込むときの設定の置き方や、間違えて取り込んだイベントの消し方、`PROXY_TOKEN` の作り直し方は [docs/production-db.md](docs/production-db.md) にあります。

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

## 管理画面 (動画のアップロードとイベントの登録)

`/admin` の管理画面で、ブラウザから動画を R2 にアップロードし、イベント・エントリー・各動画の出演者を DB に登録できます。登録は `bun run db:import` と同じ処理で、D1 のトークンは要りません。
1. `/admin` を開き、合言葉 (`NUXT_ADMIN_PASSWORD`) でログインする
2. イベントの情報を書く (登録済みのイベントを選ぶと、その内容を読み込んで直せる)
3. エントリーを「`1: BLAZE`」の形で 1 行に 1 人ずつ書く
4. 動画を選ぶ。「フォルダを選ぶ」で `videos/` のようなフォルダを選ぶと、その下の `予選/M1256.mp4` のようなパスがキーの後ろになる (キーは `<シリーズID>/<イベントID>/予選/M1256.mp4`)。ファイルだけを選ぶときは、横の欄に分類 (予選など) を書いておく。動画の長さはファイル (MP4 の moov) から読む
5. 「R2 にアップロード」で、R2 にない (またはサイズの違う) 動画を送る。動画はブラウザから R2 にマルチパートアップロードで直接送り、アプリのサーバーは通らない
6. 各動画の出演 No. (`1, 2` のように) を書き、「確認だけ」で誤りがないか見てから「登録する」。登録は `db:import` と同じく、そのイベントの分を入れ直す。登録の前に、すべての動画が R2 に同じサイズで置かれているかも確かめる

画面に出るまでの時間は `db:import` と同じです (ISR で最大 1 時間。すぐ出すには再デプロイ)。登録したあとに本番ページで確かめることは [docs/production-db.md](docs/production-db.md#登録したあと本番ページで確かめる) にまとめています。

### 認証

簡易的な合言葉の認証です。合言葉が合うと、合言葉を鍵に署名した Cookie (`HttpOnly`・`SameSite=Strict`・12 時間) を渡し、`/api/admin/**` はこの Cookie がないと 401 を返します。合言葉を変えると、それまでのログインはすべて切れます。`NUXT_ADMIN_PASSWORD` が空なら、だれもログインできません (管理画面は使えない)。間違えたときは 1 秒待たせて総当たりを遅らせているだけなので、合言葉は長いランダムな値 (`openssl rand -base64 24` など) にしてください。

### 設定

| 環境変数                           | 意味                                                                                            |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `NUXT_ADMIN_PASSWORD`              | 管理画面の合言葉。空なら管理画面は使えない                                                      |
| `NUXT_R2_UPLOAD_ACCESS_KEY_ID`     | 書き込み用の R2 の API トークンのアクセスキー ID (ダウンロード用の読み出し専用のトークンとは別) |
| `NUXT_R2_UPLOAD_SECRET_ACCESS_KEY` | 同じトークンのシークレットアクセスキー                                                          |
| `NUXT_R2_ENDPOINT`                 | R2 の代わりに使う S3 互換の API の URL。ローカルで試すときだけ使う (ふだんは空)                 |

書き込み用の R2 の API トークンは、権限を「Object Read & Write」にし、対象をこのバケットだけに絞って作ってください (`NUXT_R2_ACCOUNT_ID`・`NUXT_R2_BUCKET` はダウンロードと共通)。

ブラウザから R2 に直接 PUT するので、バケットの CORS に、アプリのオリジンからの `PUT` を許す設定が要ります。Cloudflare のダッシュボードで R2 → バケット → Settings → CORS Policy に [docs/r2-cors.json](docs/r2-cors.json) の内容を入れてください (オリジンは実際の URL に合わせる)。設定がないと、アップロードで「R2 に送れませんでした」と出ます。

### ローカルで試す

rclone の `serve s3` で、ローカルのディレクトリを R2 の代わりにできます。

```bash
mkdir -p /tmp/fake-r2/wotagei-battle-log
rclone serve s3 --auth-key testkey,testsecret --addr 127.0.0.1:9100 --allow-origin http://localhost:3000 /tmp/fake-r2

NUXT_ADMIN_PASSWORD=local-admin NUXT_R2_ENDPOINT=http://127.0.0.1:9100 NUXT_R2_ACCOUNT_ID=local \
NUXT_R2_ACCESS_KEY_ID=testkey NUXT_R2_SECRET_ACCESS_KEY=testsecret \
NUXT_R2_UPLOAD_ACCESS_KEY_ID=testkey NUXT_R2_UPLOAD_SECRET_ACCESS_KEY=testsecret bun run dev
```

## 動画のダウンロード

動画は Cloudflare R2 のバケット `wotagei-battle-log` に置いています (アップロードは管理画面で行う)。プレイヤー画面のダウンロードボタンは `/download/<series>/<event>/players/<エントリー No.>/<動画の No.>` を開き、サーバーが DB で動画の置き場所を引いて、R2 の署名付き URL (10 分有効) に転送します。ブラウザは R2 から直接ダウンロードするので、アプリのサーバーを動画が通ることはなく、R2 の CORS の設定も要りません。

署名付き URL を作るため、Vercel プロジェクトの環境変数に次を設定します (ローカルで試すときは `.env` に書く)。

| 環境変数                    | 意味                                                      |
| --------------------------- | --------------------------------------------------------- |
| `NUXT_R2_ACCOUNT_ID`        | R2 があるアカウントの ID                                  |
| `NUXT_R2_ACCESS_KEY_ID`     | R2 の API トークンのアクセスキー ID                       |
| `NUXT_R2_SECRET_ACCESS_KEY` | R2 の API トークンのシークレットアクセスキー              |
| `NUXT_R2_BUCKET`            | 動画を置いているバケット。省略すると `wotagei-battle-log` |

R2 の API トークンは、権限を「Object Read only」にし、対象をこのバケットだけに絞って作ってください。

## 本番

本番用にアプリケーションをビルドし、ローカルでプレビューします。

```bash
bun run build
bun run preview
```

詳しくは [デプロイのドキュメント](https://nuxt.com/docs/getting-started/deployment) を参照してください。
