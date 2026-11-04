// イベントを 1 つの文字列で表すキー (`シリーズID/イベントID`)
import type { EventIds } from '~/utils/adminApi'

/** `シリーズID/イベントID`。登録済みのイベントの選択肢の値などに使う */
export function eventKey(ids: EventIds) {
  return `${ids.seriesId}/${ids.eventId}`
}

/** eventKey の逆 */
export function parseEventKey(key: string): EventIds {
  const [seriesId = '', eventId = ''] = key.split('/')
  return { seriesId, eventId }
}

/** 動画のキーの、相対パスの前に付く部分 (`シリーズID/イベントID/`) */
export function eventPrefix(ids: EventIds) {
  return `${eventKey(ids)}/`
}
