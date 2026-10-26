// イベントの情報 (名前・開催日・運営の連絡先)
export default defineEventHandler(async (event) => {
  const found = await getEvent(
    getRouterParam(event, 'series') ?? '',
    getRouterParam(event, 'event') ?? '',
  )
  if (!found) {
    throw createError({ status: 404, statusText: 'Event Not Found' })
  }
  return found
})
