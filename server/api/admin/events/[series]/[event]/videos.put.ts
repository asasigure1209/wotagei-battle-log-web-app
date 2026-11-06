// 登録済みのイベントの動画と出演者だけを入れ直す。本文は { videos: [{ key, durationSec, sizeBytes, performers }] } で、
// 動画の No. は並び順。出演者は 1〜2 人で、登録済みのエントリーの No.。
// エントリー・イベントの情報には触れず、未登録のイベントなら 400。
// 登録の前に、動画が R2 に同じサイズで置かれているかも確かめる。?dryRun=1 なら確かめるだけ
export default defineEventHandler(async (event) => {
  const { series, event: eventId } = requireEventIds(
    getRouterParam(event, 'series'),
    getRouterParam(event, 'event'),
  )
  const body = await readBody(event)
  const r2 = requireR2Upload(useRuntimeConfig(event).r2)
  const prefix = `${series}/${eventId}/`
  // D1 と R2 は別々に引けるので、待ち合わせずに並べて引く
  const [registered, entryNos, objects] = await Promise.all([
    hasAdminEvent(series, eventId),
    listAdminEntryNos(series, eventId),
    listObjects(r2, prefix),
  ])
  if (!registered) throw unregisteredEvent(series, eventId)
  const videos = parseVideosBody(body, { prefix, entryNos })
  const problems = missingVideoProblems(videos, objects)
  if (problems.length) throw invalidManifest(problems)

  if (getQuery(event).dryRun) return { ok: true, dryRun: true }
  // 確かめたあとにイベントやエントリーが消されていたら・ほかのイベントと動画のキーが重なるなど、DB に弾かれたら 400
  await invalidOnDbError(() => replaceAdminEventVideos(series, eventId, videos))
  return { ok: true, dryRun: false }
})
