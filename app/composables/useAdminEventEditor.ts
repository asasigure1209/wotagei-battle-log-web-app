// 管理画面のエディター。1 つのイベントの情報・エントリー・動画を書き、動画を R2 に送り、DB に取り込むまで。
// 処理は utils/adminEditor/ の関数に分け、ここでは状態を reactive にし、画面から呼べる形に束ねて
// 各セクションのコンポーネントに provide する (useAdminEditor で受け取る)
import {
  computed,
  type InjectionKey,
  inject,
  provide,
  reactive,
  ref,
} from 'vue'
import {
  deleteEvent,
  loadEvent,
  register,
  reset,
} from '~/utils/adminEditor/registration'
import {
  addFiles,
  moveRow,
  removeRow,
  rowState,
  sortRows,
} from '~/utils/adminEditor/rows'
import {
  createEditorState,
  type EditorState,
  eventKey,
  idsValid,
  parseEventKey,
} from '~/utils/adminEditor/state'
import {
  cancelUpload,
  refreshRemote,
  uploadAll,
  uploadTargets,
} from '~/utils/adminEditor/upload'
import { parseEntriesText } from '~/utils/adminManifest'

/** 登録済みのイベントの一覧の 1 件 (GET /api/admin/events) */
export type EventSummary = {
  seriesId: string
  seriesName: string
  eventId: string
  eventName: string
  date: string
}

export type AdminEditor = ReturnType<typeof createAdminEditor>

const editorKey: InjectionKey<AdminEditor> = Symbol('adminEditor')

/** エディターを作り、子のコンポーネントに渡す。onUnauthorized はログインが切れたときに呼ぶ */
export function useAdminEventEditor(onUnauthorized: () => void) {
  const editor = createAdminEditor(onUnauthorized)
  provide(editorKey, editor)
  return editor
}

/** 親 (useAdminEventEditor) が作ったエディターを受け取る */
export function useAdminEditor() {
  const editor = inject(editorKey)
  if (!editor) throw new Error('useAdminEventEditor の中で使ってください')
  return editor
}

function createAdminEditor(onUnauthorized: () => void) {
  const state: EditorState = reactive(createEditorState(onUnauthorized))
  const events = useRegisteredEvents(onUnauthorized)

  const entries = computed(() => parseEntriesText(state.entriesText))
  const targets = computed(() => uploadTargets(state))
  /** 行ごとの状態 (行の id → 状態)。表の 1 行で何度も使うので、1 度だけ出す */
  const rowStates = computed(
    () => new Map(state.rows.map((r) => [r.id, rowState(r, state.remote)])),
  )
  const valid = computed(() => idsValid(state))
  const currentKey = computed(() => eventKey(state.form))
  /** すべての動画が R2 にあり、登録できるか */
  const canRegister = computed(
    () =>
      valid.value &&
      state.rows.length > 0 &&
      !state.busy &&
      state.rows.every((r) => rowStates.value.get(r.id)?.kind === 'ok'),
  )

  return {
    state,
    events,
    entries,
    targets,
    rowStates,
    idsValid: valid,
    currentKey,
    canRegister,
    /** 登録済みのイベントを開く。key が空なら新しいイベントを書き始める */
    open: (key: string) =>
      key ? loadEvent(state, parseEventKey(key)) : reset(state),
    addFiles: (files: File[], category: string) =>
      addFiles(state, files, category),
    removeRow: (id: number) => removeRow(state, id),
    moveRow: (id: number, delta: number) => moveRow(state, id, delta),
    sortRows: () => sortRows(state),
    refreshRemote: () => refreshRemote(state),
    uploadAll: () => uploadAll(state),
    cancelUpload: () => cancelUpload(state),
    /** 登録する (dryRun なら確かめるだけ)。登録できたら一覧を読み直す */
    register: async (dryRun: boolean) => {
      const ok = await register(state, dryRun)
      if (ok && !dryRun) await events.reload()
    },
    deleteEvent: async () => {
      if (await deleteEvent(state)) await events.reload()
    },
  }
}

/** 登録済みのイベントの一覧 */
function useRegisteredEvents(onUnauthorized: () => void) {
  const list = ref<EventSummary[]>([])
  async function reload() {
    try {
      list.value = await $fetch<EventSummary[]>('/api/admin/events')
    } catch (error) {
      if (isUnauthorized(error)) onUnauthorized()
    }
  }
  /** key (`シリーズID/イベントID`) のイベントが登録済みか */
  const has = (key: string) => list.value.some((e) => eventKey(e) === key)
  return { list, reload, has }
}
