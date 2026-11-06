# 本番の DB をコマンドで扱う

ふだんのイベントの登録は管理画面 (`/admin`) で行う。ここでは、管理画面ではできないことや、コマンドで本番の D1 を扱うときの手順を書く。コマンドはリポジトリのルートで実行する。例として、シリーズ ID `elnino`・イベント ID `elnino_vol_5` を使う。

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

トークンがわからなくなったとき (Vercel の画面で値が見られないときなど) は、[トークンを作り直す](#トークンを作り直す) を見る。

設定ファイルの環境変数がそのあとのコマンドに残らないよう、使うときは `( )` の中だけで読み込む。

```bash
(set -a; . ~/.config/wotagei/prod.env; set +a; bun run db:import <yaml> --dry-run)
```

`取り込み先:` が本番の Worker の URL になっていることを確かめてから、`--dry-run` を外して取り込む。`file:.data/db.sqlite` と出たら、設定ファイルを読めていない。

## 登録したあと本番ページで確かめる

管理画面や `db:import` で登録したら、本番ページで表示を確かめる。本番の Web アプリには Vercel のログインがかかっているので、Vercel にログインしたブラウザで開く。

| ページ                                                                       | 確かめること                                                                      |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| https://wotagei-battle-log-web-app.vercel.app/elnino/elnino_vol_5            | イベント名と、エントリーの全員が並んでいる                                        |
| https://wotagei-battle-log-web-app.vercel.app/elnino/elnino_vol_5/players/01 | そのエントリーが出ている動画のファイル名・長さ・サイズ。No. は 2 桁 (`01`) で書く |

何人か選んで、出ている動画が登録した出演者どおりか確かめる。1 本はダウンロードボタンを押して、R2 の動画が保存できることも確かめる。

本番の画面は Vercel の ISR で 1 時間とっておくので、登録してから画面に出るまで最大 1 時間かかる。すぐに確かめたいときは本番を再デプロイする (詳しくは README.md の「イベントの取り込み」)。

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

ふだんは管理画面のイベントの登録 (`/admin/events`) で、イベントを選んで「このイベントを消す」で消す。管理画面が使えないときは、SQL で消す。イベントを消すと、そのエントリー・動画・出演者も一緒に消える (`ON DELETE CASCADE`)。シリーズとほかのイベントは残る。

```bash
(set -a; . ~/.config/wotagei/prod.env; set +a
 curl -s -X POST "$NUXT_D1_PROXY_URL/query" \
   -H "authorization: Bearer $NUXT_D1_PROXY_TOKEN" -H 'content-type: application/json' \
   -d '{"sql":"delete from events where series_id = ? and id = ?","params":["elnino","elnino_vol_5"]}')
```

DB から消しても R2 の動画は残る。R2 の動画も消すときは、Cloudflare のダッシュボードの R2 → バケット `wotagei-battle-log` で、`<シリーズID>/<イベントID>/` の下を消す。

## エントリーの No. に抜けがあるイベントを直す

管理画面のエントリーの登録 (`/admin/entries`) は No. を書いた順に 1 から振り直すので、登録済みのエントリーの No. に抜けがある (`1: A` / `3: C` のような) イベントでは、出演者がずれないよう登録できないようにしている。動画の登録の画面 (`/admin/videos`) はエントリーを書き換えない。このときは、イベントの manifest を書き直して `db:import` で取り込み直す。
1. 管理画面にログインしたブラウザで `/api/admin/events/elnino/elnino_vol_5` を開くと、登録済みのシリーズ・イベント・エントリー・動画 (出演者の No. つき) が JSON で出る。これを見ながら、`server/db/seed.yaml` と同じ形の YAML を書く (`entries` は `No.: 名前` の形)
2. エントリーの No. を 1 から抜けなく付け直し、各動画の `performers` も新しい No. に合わせて直す。No. はダウンロードの URL (`/players/<No.>`) にも入るので、変わった人の URL は共有し直す
3. [本番の DB につなぐための設定ファイル](#本番の-db-につなぐための設定ファイル) を読み込んで `bun run db:import <yaml> --dry-run` で確かめてから、`--dry-run` を外して取り込む。取り込むと、そのイベントのエントリー・動画・出演者が入れ替わる

## トークンを作り直す

トークンは Worker の `PROXY_TOKEN` と Vercel の `NUXT_D1_PROXY_TOKEN` に同じ値を入れる。本番のアプリが DB を読めなくなる時間を短くするため、Vercel を先に書き換えておき、Worker を変えたらすぐ再デプロイする。
1. いまの設定ファイルを残してから、新しい値を作って `~/.config/wotagei/prod.env` に書く。途中で止まったときは、`prod.env.bak` を戻せば元のトークンで使える (Vercel と Worker をまだ書き換えていなければ)

   ```bash
   umask 077
   cp ~/.config/wotagei/prod.env ~/.config/wotagei/prod.env.bak
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
6. 200 が返ったら、古いトークンの入った `prod.env.bak` を消す (`rm ~/.config/wotagei/prod.env.bak`)
