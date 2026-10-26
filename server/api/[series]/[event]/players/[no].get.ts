// プレイヤーと、その動画
export default defineEventHandler(async (event) => {
  const player = await getPlayer(
    getRouterParam(event, 'series') ?? '',
    getRouterParam(event, 'event') ?? '',
    getRouterParam(event, 'no') ?? '',
  )
  if (!player) {
    throw createError({ status: 404, statusText: 'Player Not Found' })
  }
  return player
})
