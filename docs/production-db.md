# 本番の DB をコマンドで扱う

ふだんのイベントの登録は管理画面 (`/admin`) で行う。ここでは、管理画面ではできないことや、コマンドで本番の D1 を扱うときの手順を書く。コマンドはリポジトリのルートで実行する。

| 項目             | 本番の値                                                 |
| ---------------- | -------------------------------------------------------- |
| Web アプリ       | https://wotagei-battle-log-web-app.vercel.app            |
| D1 の中継 Worker | https://wotagei-battle-log-d1-proxy.mkmokymh.workers.dev |
| R2               | バケット `wotagei-battle-log`                            |

## 本番の DB につなぐための設定ファイル

`db:import` などは、中継 Worker に SQL を送って本番の D1 に書き込む。Worker は受け取った SQL をそのまま実行するので、トークン (Worker の `PROXY_TOKEN`) を知っている人だけが使えるようにしている。Worker の URL とトークンを、リポジトリの外のファイルに置く。

```bash
mkdir -p ~/.config/wotagei
umask 077   # 自分だけが読めるファイルにする
cat > ~/.config/wotagei/prod.env <<'EOF'
NUXT_D1_PROXY_URL=https://wotagei-battle-log-d1-proxy.mkmokymh.workers.dev
NUXT_D1_PROXY_TOKEN=<Vercel の NUXT_D1_PROXY_TOKEN と同じ値>
EOF
```

設定ファイルの環境変数がそのあとのコマンドに残らないよう、使うときは `( )` の中だけで読み込む。

```bash
(set -a; . ~/.config/wotagei/prod.env; set +a; bun run db:import <yaml> --dry-run)
```

`取り込み先:` が本番の Worker の URL になっていることを確かめてから、`--dry-run` を外して取り込む。`file:.data/db.sqlite` と出たら、設定ファイルを読めていない。

## 本番ページが 500 エラーになる

Web アプリが本番の DB を読めていない。Vercel の環境変数 `NUXT_D1_PROXY_URL` が本番の Worker の URL になっているか、`NUXT_D1_PROXY_TOKEN` が Worker の `PROXY_TOKEN` と同じか確かめる。環境変数を変えたら、Vercel で再デプロイしないと反映されない。

Worker とトークンが合っているかは、次で確かめられる (200 で結果が返れば合っている。401 ならトークンが違う)。

```bash
(set -a; . ~/.config/wotagei/prod.env; set +a
 curl -s -w '\nHTTP %{http_code}\n' -X POST "$NUXT_D1_PROXY_URL/query" \
   -H "authorization: Bearer $NUXT_D1_PROXY_TOKEN" -H 'content-type: application/json' \
   -d '{"sql":"select id, name from event_series","params":[]}')
```

## 間違えて登録したイベントを消す

管理画面にも `db:import` にも消す機能がないので、SQL で消す。イベントを消すと、そのエントリー・動画・出演者も一緒に消える (`ON DELETE CASCADE`)。シリーズとほかのイベントは残る。

```bash
(set -a; . ~/.config/wotagei/prod.env; set +a
 curl -s -X POST "$NUXT_D1_PROXY_URL/query" \
   -H "authorization: Bearer $NUXT_D1_PROXY_TOKEN" -H 'content-type: application/json' \
   -d '{"sql":"delete from events where series_id = ? and id = ?","params":["elnino","elnino_vol_5"]}')
```

DB から消しても R2 の動画は残る。R2 の動画も消すときは、Cloudflare のダッシュボードの R2 → バケット `wotagei-battle-log` で、`<シリーズID>/<イベントID>/` の下を消す。

## トークンを作り直す

トークンは Worker の `PROXY_TOKEN` と Vercel の `NUXT_D1_PROXY_TOKEN` に同じ値を入れる。本番のアプリが DB を読めなくなる時間を短くするため、Vercel を先に書き換えておき、Worker を変えたらすぐ再デプロイする。
1. 新しい値を作って `~/.config/wotagei/prod.env` に書く

   ```bash
   umask 077
   cat > ~/.config/wotagei/prod.env <<EOF
   NUXT_D1_PROXY_URL=https://wotagei-battle-log-d1-proxy.mkmokymh.workers.dev
   NUXT_D1_PROXY_TOKEN=$(openssl rand -hex 32)
   EOF
   ```

2. Vercel の Settings → Environment Variables で `NUXT_D1_PROXY_TOKEN` を同じ値に書き換える (再デプロイするまでは反映されない)
3. Worker の `PROXY_TOKEN` を書き換える。ここから 4 が終わるまで、本番のアプリは DB を読めない

   ```bash
   bunx wrangler login
   grep TOKEN ~/.config/wotagei/prod.env | cut -d= -f2 \
     | bunx wrangler secret put PROXY_TOKEN -c workers/d1-proxy/wrangler.toml
   ```

4. すぐに Vercel の Deployments から本番を Redeploy する
5. [本番ページが 500 エラーになる](#本番ページが-500-エラーになる) のコマンドで、200 が返るか確かめる
