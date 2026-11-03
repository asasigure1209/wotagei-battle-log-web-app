// 登録済みのイベント (manifest と同じ形)
export default defineEventHandler(async (event) => {
  const found = await getAdminEvent(
    getRouterParam(event, 'series') ?? '',
    getRouterParam(event, 'event') ?? '',
  )
  if (!found) {
    throw createError({ status: 404, statusText: 'Event Not Found' })
  }
  return found
})
