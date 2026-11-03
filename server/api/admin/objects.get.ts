// イベントの R2 にある動画 (キーとサイズ)。管理画面が、アップロード済みかを見分けるのに使う
export default defineEventHandler((event) => {
  const query = getQuery(event)
  const { series, event: eventId } = requireEventIds(query.series, query.event)
  return listObjects(requireR2Upload(event), `${series}/${eventId}/`)
})
