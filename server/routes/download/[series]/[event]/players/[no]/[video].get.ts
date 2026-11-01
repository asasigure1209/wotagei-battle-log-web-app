// プレイヤーの動画をダウンロードする。ブラウザが直接開くので、合言葉の要る /api の外に置く。
// 動画は R2 から直接取らせ、ここは署名付き URL へ転送するだけにする
export default defineEventHandler(async (event) => {
  const { r2 } = useRuntimeConfig(event)
  // R2 の値がないと、どこにもない URL に転送してしまうので、DB を引く前に止める
  if (!isR2Configured(r2)) {
    throw createError({ status: 500, statusText: 'R2 Is Not Configured' })
  }
  const {
    series = '',
    event: eventId = '',
    no = '',
    video: videoNo = '',
  } = getRouterParams(event)
  const video = await getPlayerVideo(series, eventId, no, videoNo)
  if (!video) {
    throw createError({ status: 404, statusText: 'Video Not Found' })
  }
  const url = await presignDownloadUrl(r2, video.storageKey, video.fileName)
  // 署名付き URL には期限があるので、転送をキャッシュさせない
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return sendRedirect(event, url, 302)
})
