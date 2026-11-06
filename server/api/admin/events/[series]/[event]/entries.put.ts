// 登録済みのイベントのエントリーだけを登録する。本文は { names: 名前の配列 } で、エントリー No. は書いた順に 1 から。
// 名前だけを直した No. は出演者の紐づけを残し、動画に出ているエントリーが消える登録は 400 で弾く。
// 動画・出演者・イベントの情報には触れず、未登録のイベントなら 400。?dryRun=1 なら確かめるだけ
export default defineEventHandler(async (event) => {
  const { series, event: eventId } = requireEventIds(
    getRouterParam(event, 'series'),
    getRouterParam(event, 'event'),
  )
  const entries = parseEntryNamesBody(await readBody(event))
  // D1 は中継 Worker を通すので、待ち合わせずに並べて引く
  const [registered, performed] = await Promise.all([
    hasAdminEvent(series, eventId),
    listPerformedEntries(series, eventId),
  ])
  if (!registered) throw unregisteredEvent(series, eventId)
  const problems = removedPerformerProblems(entries, performed)
  if (problems.length) throw invalidManifest(problems)

  if (getQuery(event).dryRun) return { ok: true, dryRun: true }
  // 確かめたあとにイベントが消されていたら、外部キーで弾かれて 400 になる
  await invalidOnDbError(() => saveAdminEntries(series, eventId, entries))
  return { ok: true, dryRun: false }
})
