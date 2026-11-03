// イベントを消す (エントリー・動画・出演者も一緒に消える)。R2 の動画は消さない
export default defineEventHandler(async (event) => {
  await deleteAdminEvent(
    getRouterParam(event, 'series') ?? '',
    getRouterParam(event, 'event') ?? '',
  )
  return { ok: true }
})
