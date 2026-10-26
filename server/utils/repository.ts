// API が返すデータの取り出し口。API のハンドラはここだけを呼び、データの置き場所を知らない。
// DB ができるまではモックを返す。DB に切り替えるときは、この中身だけを差し替える
// (DB の呼び出しは非同期になるので、今から async にしておく)

// テスト (nuxt 環境) からも読めるよう、Nitro の自動 import に頼らず明示する
import { mockEvent, mockPlayers, mockVideos } from './mock'

/** イベントの情報 (名前・開催日・運営の連絡先)。ないイベントは null */
export async function getEvent(_series: string, _event: string) {
  return mockEvent
}

/** イベントの出場プレイヤー (エントリー No. 順) */
export async function listPlayers(_series: string, _event: string) {
  return mockPlayers
}

/** プレイヤーと、その動画。いないプレイヤーは null */
export async function getPlayer(_series: string, _event: string, no: string) {
  const player = mockPlayers.find((p) => p.no === no)
  if (!player) return null
  // モックでは、どのプレイヤーにもモックの動画を先頭から本数ぶん使う
  return { ...player, videos: mockVideos.slice(0, player.count) }
}
