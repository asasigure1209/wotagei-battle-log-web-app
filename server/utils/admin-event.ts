// 管理画面のイベントの登録 (/api/admin/events/**) で共通に使う、リクエストの確かめ。
// テスト (node 環境) からも呼べるよう、Nitro の自動 import に頼らず明示する
import { createError } from 'h3'
import {
  type Manifest,
  ManifestError,
  parseEventInfo,
  parseManifest,
} from '../db/manifest'

/** 誤りの一覧を持つ 400。画面は data.problems を 1 行ずつ出す */
export function invalidManifest(problems: string[]) {
  return createError({
    status: 400,
    statusText: 'Invalid Manifest',
    message: problems.join('\n'),
    data: { problems },
  })
}

/** parse が投げた ManifestError を 400 にして投げ直す */
function orInvalid<T>(parse: () => T) {
  try {
    return parse()
  } catch (error) {
    if (error instanceof ManifestError) throw invalidManifest(error.problems)
    throw error
  }
}

/** manifest を確かめる。誤りがあれば 400 */
export function parseManifestBody(body: unknown) {
  return orInvalid(() => parseManifest(body))
}

/**
 * パスの ID と本文 ({ seriesName, name, date, contact }) から、シリーズとイベントの情報を作る。
 * 誤りがあれば 400
 */
export function parseEventInfoBody(
  seriesId: string,
  eventId: string,
  body: unknown,
) {
  const { seriesName, ...event } = (body ?? {}) as Record<string, unknown>
  return orInvalid(() =>
    parseEventInfo({
      series: { id: seriesId, name: seriesName },
      event: { ...event, id: eventId },
    }),
  )
}

/**
 * 管理画面から登録するエントリーと動画の manifest が、登録済みのイベントのものか。未登録なら 400。
 * イベントの情報はイベントの登録の画面でだけ書くので、この画面からはイベントを作らない
 */
export function requireRegisteredEvent(
  manifest: Manifest,
  registered: boolean,
) {
  if (registered) return
  const key = `${manifest.series.id}/${manifest.event.id}`
  throw invalidManifest([
    `登録されていないイベントです (${key})。先にイベントの登録の画面で登録してください`,
  ])
}
