// 開発用の DB に、サンプル (seed.yaml) を入れる。本番のデータと同じく manifest として取り込み、
// そのイベントの分を入れ直すので、何度流しても同じ中身になる。
// 本番の DB にサンプルを入れないよう、中継 Worker の先に流すのは --allow-d1-proxy を付けたときだけ
// (wrangler dev で動かした、ローカルの D1 に入れるときに使う)
import { connectDb, d1ProxyCredentials, usesD1Proxy } from './client'
import { importManifest, readManifest } from './manifest'

if (usesD1Proxy() && !process.argv.includes('--allow-d1-proxy')) {
  throw new Error(
    `seed は開発用のサンプルなので、中継 Worker (${d1ProxyCredentials.url}) の先に流すときは --allow-d1-proxy を付ける`,
  )
}

await importManifest(
  await connectDb(),
  await readManifest(new URL('./seed.yaml', import.meta.url)),
)
