// プレイヤーの動画。
// DB ができるまでは、どのプレイヤーにもモックの動画を先頭から本数ぶん返す
export default defineEventHandler((event) => {
  const no = getRouterParam(event, 'no')
  const player = mockPlayers.find((p) => p.no === no)
  if (!player) {
    throw createError({ status: 404, statusText: 'Player Not Found' })
  }
  return mockVideos.slice(0, player.count)
})
