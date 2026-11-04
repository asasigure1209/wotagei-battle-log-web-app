// イベントの情報 (シリーズ名・イベント名・開催日・運営の連絡先) だけを登録する (あれば書き換える)。
// 本文は { seriesName, name, date, contact }。登録済みのエントリー・動画はそのまま残る
export default defineEventHandler(async (event) => {
  const { series, event: eventId } = requireEventIds(
    getRouterParam(event, 'series'),
    getRouterParam(event, 'event'),
  )
  await saveAdminEventInfo(
    parseEventInfoBody(series, eventId, await readBody(event)),
  )
  return { ok: true }
})
