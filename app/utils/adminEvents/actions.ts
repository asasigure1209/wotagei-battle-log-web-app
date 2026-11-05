// イベントの登録画面の操作: 登録済みのイベントを選ぶ・登録する (書き換える)・消す
import { adminApi } from '~/utils/adminApi'
import { eventKey } from '~/utils/adminCommon/eventKey'
import { info, run, showErrors } from '~/utils/adminCommon/operation'
import { type EventFormState, emptyForm } from './state'

const SAVED =
  '登録しました。続けて、このイベントのエントリーと動画を登録できます'
const DELETED =
  'DB からイベントを消しました (エントリー・動画の登録も消え、R2 の動画は残っています)'
const DUPLICATED =
  'このシリーズ ID・イベント ID のイベントはもう登録されています。直すときは、上で選んでください'

/** 登録済みのイベントの一覧を読み直す。読めなければ画面にエラーを出して false */
export function reloadList(state: EventFormState) {
  return run(state, async () => {
    state.list = await adminApi.listEvents()
  })
}

/** 登録済みのイベントをフォームに書き写す。key が空なら新しいイベントを書き始める */
export function open(state: EventFormState, key: string) {
  state.messages = null
  const found = state.list.find((e) => eventKey(e) === key)
  state.selectedKey = found ? key : ''
  state.form = found
    ? {
        seriesId: found.seriesId,
        seriesName: found.seriesName,
        eventId: found.eventId,
        eventName: found.eventName,
        date: found.date,
        contact: found.contact,
      }
    : emptyForm()
}

/** 書いたシリーズ ID が登録済みのシリーズなら、シリーズ名を埋める */
export function fillSeriesName(state: EventFormState) {
  const found = state.list.find((e) => e.seriesId === state.form.seriesId)
  if (found) state.form.seriesName = found.seriesName
}

/**
 * 書き換えではなく新しく登録してよいか。PUT はあれば書き換えるので、画面の一覧が古くても
 * 登録済みのイベントを上書きしないよう、送る前に一覧を読み直して確かめる
 */
async function canSaveAsNew(state: EventFormState) {
  if (state.selectedKey) return true
  if (!(await reloadList(state))) return false
  const key = eventKey(state.form)
  if (!state.list.some((e) => eventKey(e) === key)) return true
  showErrors(state, [DUPLICATED])
  return false
}

/**
 * 登録する (登録済みのイベントなら書き換える)。登録できたら、そのイベントを選んだことにする。
 * そのあとの一覧の読み直しに失敗しても、登録はできているので true を返す (エラーは画面に出る)
 */
export async function save(state: EventFormState) {
  if (!(await canSaveAsNew(state))) return false
  const { seriesId, eventId, seriesName, eventName, date, contact } = state.form
  const ok = await run(state, async () => {
    await adminApi.saveEventInfo(
      { seriesId, eventId },
      { seriesName, name: eventName, date, contact },
    )
  })
  if (!ok) return false
  state.selectedKey = eventKey({ seriesId, eventId })
  if (await reloadList(state)) info(state, SAVED)
  return true
}

/**
 * 選んだイベントを DB から消す。書いた内容は画面に残すので、そのまま登録し直せる。
 * そのあとの一覧の読み直しに失敗しても、消せてはいるので true を返す (エラーは画面に出る)
 */
export async function remove(state: EventFormState) {
  if (!state.selectedKey) return false
  const { seriesId, eventId } = state.form
  const ok = await run(state, async () => {
    await adminApi.deleteEvent({ seriesId, eventId })
  })
  if (!ok) return false
  state.selectedKey = ''
  if (await reloadList(state)) info(state, DELETED)
  return true
}
