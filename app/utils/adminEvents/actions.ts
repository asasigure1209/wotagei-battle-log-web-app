// イベントの登録画面の操作: 登録済みのイベントを選ぶ・登録する (書き換える)・消す
import { adminApi } from '~/utils/adminApi'
import { eventKey } from '~/utils/adminCommon/eventKey'
import { info, run, showErrors } from '~/utils/adminCommon/operation'
import { type EventFormState, emptyForm } from './state'

const SAVED =
  '登録しました。続けて、このイベントのエントリーと動画を登録できます'
const DUPLICATED =
  'このシリーズ ID・イベント ID のイベントはもう登録されています。直すときは、上で選んでください'

export async function reloadList(state: EventFormState) {
  await run(state, async () => {
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

/** 新しく書いているイベントの ID が、もう登録されているか */
function duplicated(state: EventFormState) {
  if (state.selectedKey) return false
  const key = eventKey(state.form)
  return state.list.some((e) => eventKey(e) === key)
}

/** 登録する (登録済みのイベントなら書き換える)。登録できたら、そのイベントを選んだことにする */
export async function save(state: EventFormState) {
  if (duplicated(state)) {
    showErrors(state, [DUPLICATED])
    return false
  }
  const { seriesId, eventId, seriesName, eventName, date, contact } = state.form
  const ok = await run(state, async () => {
    await adminApi.saveEventInfo(
      { seriesId, eventId },
      { seriesName, name: eventName, date, contact },
    )
    state.list = await adminApi.listEvents()
  })
  if (!ok) return false
  state.selectedKey = eventKey({ seriesId, eventId })
  info(state, SAVED)
  return true
}

/** 選んだイベントを DB から消す。書いた内容は画面に残すので、そのまま登録し直せる */
export async function remove(state: EventFormState) {
  if (!state.selectedKey) return false
  const { seriesId, eventId } = state.form
  const ok = await run(state, async () => {
    await adminApi.deleteEvent({ seriesId, eventId })
    state.list = await adminApi.listEvents()
  })
  if (!ok) return false
  state.selectedKey = ''
  info(
    state,
    'DB からイベントを消しました (エントリー・動画の登録も消え、R2 の動画は残っています)',
  )
  return true
}
