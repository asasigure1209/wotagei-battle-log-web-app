// イベントごとのデータファイル (manifest の YAML) を DB に取り込む。
//   bun run db:import <yaml>            取り込む (そのイベントの分を入れ直す)
//   bun run db:import <yaml> --dry-run  確かめるだけで DB には書かない
// 取り込み先は、ほかのコマンドと同じく NUXT_D1_PROXY_URL (本番などの D1) か、なければローカルの SQLite ファイル
import { connectDb, d1ProxyCredentials, dbCredentials } from './client'
import { importManifest, readManifest } from './manifest'

const args = process.argv.slice(2)
const file = args.find((arg) => !arg.startsWith('--'))
if (!file) {
  console.error('usage: bun run db:import <yaml> [--dry-run]')
  process.exit(1)
}

let manifest: Awaited<ReturnType<typeof readManifest>>
try {
  manifest = await readManifest(file)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}

const { series, event } = manifest
const performerCount = manifest.videos.reduce(
  (n, v) => n + v.performers.length,
  0,
)
console.log(
  `${series.id}/${event.id} (${event.name}): エントリー ${manifest.entries.length} 人・動画 ${manifest.videos.length} 本・出演 ${performerCount} 件`,
)
console.log(`取り込み先: ${d1ProxyCredentials.url ?? dbCredentials.url}`)

if (args.includes('--dry-run')) {
  console.log('--dry-run なので、DB には書いていません')
  process.exit(0)
}

try {
  await importManifest(await connectDb(), manifest)
} catch (error) {
  // 確かめた manifest が DB で弾かれたとき (ほかのイベントと動画のキーが重なるなど) も、原因がわかるようにそのまま出す
  console.error(error)
  process.exit(1)
}
console.log('取り込みました (このイベントのそれまでのデータは入れ直しました)')
