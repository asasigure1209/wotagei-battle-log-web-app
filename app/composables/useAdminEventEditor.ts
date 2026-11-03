// 管理画面のエディター。1 つのイベントの情報・エントリー・動画を書き、動画を R2 に送り、DB に取り込むまで。
// 処理は utils/adminEditor/ の関数に分け、ここでは状態を reactive にし、画面から呼べる形に束ねる。
// 親 (AdminEventEditor) が provideAdminEditor で作って渡し、各セクションは useAdminEditor で受け取る
import {
  computed,
  type InjectionKey,
  inject,
  onMounted,
  provide,
  reactive,
  ref,
} from 'vue'
import { adminApi, type EventSummary } from '~/utils/adminApi'
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
  updateRow,
} from '~/utils/adminEditor/rows'
import {
  createEditorState,
  type EditorState,
  eventKey,
  idsValid,
  parseEventKey,
  run,
} from '~/utils/adminEditor/state'
import {
  cancelUpload,
  refreshRemote,
  uploadAll,
  uploadTargets,
} from '~/utils/adminEditor/upload'
import { parseEntriesText } from '~/utils/adminManifest'

type AdminEditor = ReturnType<typeof createAdminEditor>

const editorKey: InjectionKey<AdminEditor> = Symbol('adminEditor')

/** エディターを作り、子のコンポーネントに渡す。onUnauthorized はログインが切れたときに呼ぶ */
export function provideAdminEditor(onUnauthorized: () => void) {
  const editor = createAdminEditor(onUnauthorized)
  provide(editorKey, editor)
  onMounted(editor.events.reload)
  return editor
}

/** 親 (provideAdminEditor) が作ったエディターを受け取る */
export function useAdminEditor() {
  const editor = inject(editorKey)
  if (!editor) throw new Error('provideAdminEditor の中で使ってください')
  return editor
}

function createAdminEditor(onUnauthorized: () => void) {
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
    /** 登録済みのイベントを開く。key が空なら新しいイベントを書き始める */
    open: (key: string) =>
      key ? loadEvent(state, parseEventKey(key)) : reset(state),
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

/** 登録済みのイベントの一覧。読み込みに失敗したときは、ほかの操作と同じく画面にエラーを出す */
function useRegisteredEvents(state: EditorState) {
  const list = ref<EventSummary[]>([])
  const reload = async () => {
    await run(state, async () => {
      list.value = await adminApi.listEvents()
    })
  }
  /** key (`シリーズID/イベントID`) のイベントが登録済みか */
  const has = (key: string) => list.value.some((e) => eventKey(e) === key)
  return { list, reload, has }
}
