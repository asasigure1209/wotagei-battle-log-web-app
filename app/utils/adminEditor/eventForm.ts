// イベントの登録の画面 (/admin/events) のエディター。新しいイベントの情報を書いて登録するか、登録済みのイベントを選んで直す・消す。
// エントリー・動画の登録 (editor.ts) とは別の画面なので、状態も別に持つ
import { computed, reactive } from 'vue'
import { adminApi, type EventSummary } from '~/utils/adminApi'
import type { EventInfo } from '~~/server/db/manifest'
import { isId } from '~~/shared/utils/id'
import {
  type EventForm,
  emptyForm,
  eventKey,
  eventNotFoundMessage,
  info,
  type RunState,
  run,
  showErrors,
} from './state'

export type EventFormState = RunState & {
  form: EventForm
  /** 登録済みのイベントを選んでいるか (または登録したか)。そのあいだは ID を変えられない */
  loaded: boolean
  /** 登録済みのイベントの一覧 */
  list: EventSummary[]
}

export type EventFormEditor = ReturnType<typeof createEventFormEditor>

const CREATED =
  '登録しました。続けて「エントリー・動画を登録する」で、このイベントのエントリーと動画を登録してください'
const UPDATED =
  'イベントの情報を書き換えました (エントリー・動画はそのままです)。公開ページは最大 1 時間とっておかれます'
const DELETED =
  'イベントを消しました。エントリー・動画の登録も一緒に消えます (R2 の動画は残っています)'
const DUPLICATED = 'はもう登録されています。直すときは、上で選んでください'

/** エディターを作る。画面からは composables の useAdminEventForm を通して使う */
export function createEventFormEditor(onUnauthorized: () => void) {
  const state: EventFormState = reactive({
    form: emptyForm(),
    loaded: false,
    list: [],
    messages: null,
    busy: false,
    onUnauthorized,
  })
  const currentKey = computed(() => eventKey(state.form))
  return {
    state,
    currentKey,
    idsValid: computed(
      () => isId(state.form.seriesId) && isId(state.form.eventId),
    ),
    /** 新しく作るときに、もう登録されている ID を書いたか (そのまま登録すると上書きしてしまう) */
    duplicated: computed(() => isDuplicated(state)),
    seriesRename: computed(() => seriesRename(state)),
    reload: () => reload(state),
    open: (key: string) => open(state, key),
    /**
     * 画面を開いたときに、登録済みのイベントの一覧を読み、key (URL の ?event=) のイベントを選ぶ。
     * 一覧にないイベントなら、そう知らせる (新しいイベントを作るつもりで同じ ID を書かないように)
     */
    openInitial: (key: string) => openInitial(state, key),
    save: () => save(state),
    remove: () => remove(state),
  }
}

/**
 * シリーズ名を、登録済みの名前から変えようとしているときの、元の名前とほかのイベントの数。そうでなければ null。
 * シリーズ名は同じシリーズのイベントで共通なので、変えるとほかのイベントの表示も変わる
 */
function seriesRename(state: EventFormState) {
  const { seriesId, seriesName } = state.form
  const key = eventKey(state.form)
  const sameSeries = state.list.filter((e) => e.seriesId === seriesId)
  const registered = sameSeries[0]?.seriesName
  if (registered === undefined || registered === seriesName.trim()) return null
  const others = sameSeries.filter((e) => eventKey(e) !== key).length
  return others ? { from: registered, others } : null
}

function isDuplicated(state: EventFormState) {
  const key = eventKey(state.form)
  return !state.loaded && state.list.some((e) => eventKey(e) === key)
}

/** 登録済みのイベントの一覧を読み直す */
export function reload(state: EventFormState) {
  return run(state, async () => {
    state.list = await adminApi.listEvents()
  })
}

/** 登録済みのイベントを選んで書き写す。key が空 (または一覧にない) なら新しいイベントを書き始める */
export function open(state: EventFormState, key: string) {
  state.messages = null
  const found = state.list.find((e) => eventKey(e) === key)
  state.loaded = !!found
  state.form = found ? formOf(found) : emptyForm()
}

export async function openInitial(state: EventFormState, key: string) {
  if (!(await reload(state)) || !key) return
  open(state, key)
  if (!state.loaded) showErrors(state, [eventNotFoundMessage(key)])
}

/** イベントの情報を登録する。新しいイベントなら作り、選んだイベントなら書き換える */
export async function save(state: EventFormState) {
  if (isDuplicated(state)) {
    showErrors(state, [`${eventKey(state.form)} ${DUPLICATED}`])
    return false
  }
  const create = !state.loaded
  const ok = await send(state, () =>
    adminApi.saveEventInfo(eventInfo(state.form), create),
  )
  if (ok) {
    state.loaded = true
    await reloadAndTell(state, create ? CREATED : UPDATED)
  }
  return ok
}

/** 選んだイベントを DB から消す。エントリー・動画・出演者も一緒に消える */
export async function remove(state: EventFormState) {
  if (!state.loaded) return false
  const ids = { ...state.form }
  const ok = await send(state, () => adminApi.deleteEvent(ids))
  if (ok) {
    open(state, '')
    await reloadAndTell(state, DELETED)
  }
  return ok
}

/** API を呼ぶ。失敗したら画面にエラーを出して false */
function send(state: EventFormState, call: () => Promise<unknown>) {
  return run(state, async () => {
    await call()
  })
}

/** 一覧を読み直し、読めたら message を出す (読めなければ、そのエラーを出したままにする) */
async function reloadAndTell(state: EventFormState, message: string) {
  if (await reload(state)) info(state, message)
}

function formOf(e: EventSummary): EventForm {
  return {
    seriesId: e.seriesId,
    seriesName: e.seriesName,
    eventId: e.eventId,
    eventName: e.eventName,
    date: e.date,
    contact: e.contact,
  }
}

/** フォームを、API に送るイベントの情報の形にする */
function eventInfo(form: EventForm): EventInfo {
  return {
    series: { id: form.seriesId, name: form.seriesName },
    event: {
      id: form.eventId,
      name: form.eventName,
      date: form.date,
      contact: form.contact,
    },
  }
}
