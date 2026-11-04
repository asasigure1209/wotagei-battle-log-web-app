// 管理画面のエディター。utils/adminEditor/ の関数に、reactive にした状態を渡し、画面から呼べる形に束ねる。
// Nuxt が自動 import しない utils/ の下の階層に置き、画面からは composables の provideAdminEditor を通して使う
// (テストと Storybook はここから直接作る)
import { computed, type InjectionKey, reactive, ref } from 'vue'
import { adminApi, type EventSummary } from '~/utils/adminApi'
import { parseEntriesText } from '~/utils/adminManifest'
import { loadEvent, register, reset } from './registration'
import {
  addFiles,
  moveRow,
  removeRow,
  rowState,
  sortRows,
  updateRow,
} from './rows'
import {
  createEditorState,
  type EditorState,
  eventKey,
  eventNotFoundMessage,
  idsValid,
  parseEventKey,
  run,
  showErrors,
} from './state'
import { cancelUpload, refreshRemote, uploadAll, uploadTargets } from './upload'

export type AdminEditor = ReturnType<typeof createAdminEditor>

/** エディターを provide / inject するキー。Storybook では、状態を作り込んだエディターをこれで渡す */
export const adminEditorKey: InjectionKey<AdminEditor> = Symbol('adminEditor')

/** エディターを作る。画面からは composables の provideAdminEditor を通して使う */
export function createAdminEditor(onUnauthorized: () => void) {
  const state: EditorState = reactive(createEditorState(onUnauthorized))
  const events = useRegisteredEvents(state)

  const entries = computed(() => parseEntriesText(state.entriesText))
  const targets = computed(() => uploadTargets(state))
  const totalUploadBytes = computed(() =>
    targets.value.reduce((n, r) => n + r.sizeBytes, 0),
  )
  const valid = computed(() => idsValid(state))
  const currentKey = computed(() => eventKey(state.form))
  const canUpload = computed(
    () =>
      valid.value && !!state.remote && targets.value.length > 0 && !state.busy,
  )
  /** すべての動画が R2 にあり、登録できるか */
  const canRegister = computed(
    () =>
      valid.value &&
      state.rows.length > 0 &&
      !state.busy &&
      state.rows.every((r) => rowState(r, state.remote).kind === 'ok'),
  )

  return {
    state,
    events,
    entries,
    targets,
    totalUploadBytes,
    idsValid: valid,
    currentKey,
    canUpload,
    canRegister,
    /** 登録済みのイベントを選んで読み込む。key が空なら選んでいない状態に戻す */
    open: (key: string) => open(state, key),
    /**
     * 画面を開いたときに、登録済みのイベントの一覧を読み、key (URL の ?event=) のイベントを読み込む。
     * 一覧にないイベントなら、そう知らせる
     */
    openInitial: (key: string) => openInitial(state, events, key),
    /** ファイルを足し、R2 をまだ調べていなければ調べる */
    addFiles: async (files: File[], category: string) => {
      await addFiles(state, files, category)
      if (!state.remote) await refreshRemote(state)
    },
    updateRow: (id: number, patch: Parameters<typeof updateRow>[2]) =>
      updateRow(state, id, patch),
    removeRow: (id: number) => removeRow(state, id),
    moveRow: (id: number, delta: number) => moveRow(state, id, delta),
    sortRows: () => sortRows(state),
    refreshRemote: () => refreshRemote(state),
    uploadAll: () => uploadAll(state),
    cancelUpload: () => cancelUpload(state),
    /** 登録する (dryRun なら確かめるだけ) */
    register: (dryRun: boolean) => register(state, dryRun),
  }
}

function open(state: EditorState, key: string) {
  return key ? loadEvent(state, parseEventKey(key)) : reset(state)
}

async function openInitial(
  state: EditorState,
  events: RegisteredEvents,
  key: string,
) {
  if (!(await events.reload()) || !key) return
  if (events.has(key)) await open(state, key)
  else showErrors(state, [eventNotFoundMessage(key)])
}

type RegisteredEvents = ReturnType<typeof useRegisteredEvents>

/** 登録済みのイベントの一覧。読み込みに失敗したときは、ほかの操作と同じく画面にエラーを出す */
function useRegisteredEvents(state: EditorState) {
  const list = ref<EventSummary[]>([])
  /** 読み直す。読めなければ false */
  const reload = () =>
    run(state, async () => {
      list.value = await adminApi.listEvents()
    })
  /** key (`シリーズID/イベントID`) のイベントが登録済みか */
  const has = (key: string) => list.value.some((e) => eventKey(e) === key)
  return { list, reload, has }
}
