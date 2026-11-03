// イベントの R2 にある動画 (キーとサイズ)。管理画面が、アップロード済みかを見分けるのに使う
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const { series, event: eventId } = requireEventIds(query.series, query.event)
  const objects = await listObjects(
    requireR2Upload(event),
    `${series}/${eventId}/`,
  )
  return objects
})
