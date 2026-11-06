// エントリーと動画の登録画面のエディター。utils/adminEditor/ の関数に、reactive にした状態を渡し、画面から呼べる形に束ねる。
// Nuxt が自動 import しない utils/ の下の階層に置き、画面からは composables の provideAdminEditor を通して使う
// (テストと Storybook はここから直接作る)
import { computed, type InjectionKey, reactive } from 'vue'
import { eventSelection, selectedKey } from '~/utils/adminCommon/eventSelection'
import { parseEntriesText } from '~/utils/adminManifest'
import { editorLoader, register } from './registration'
import {
  addFiles,
  moveRow,
  removeRow,
  rowState,
  sortRows,
  updateRow,
} from './rows'
import { createEditorState, type EditorState } from './state'
import { cancelUpload, refreshRemote, uploadAll, uploadTargets } from './upload'

export type AdminEditor = ReturnType<typeof createAdminEditor>

/** エディターを provide / inject するキー。Storybook では、状態を作り込んだエディターをこれで渡す */
export const adminEditorKey: InjectionKey<AdminEditor> = Symbol('adminEditor')

/** エディターを作る。画面からは composables の provideAdminEditor を通して使う */
export function createAdminEditor(onUnauthorized: () => void) {
  const state: EditorState = reactive(createEditorState(onUnauthorized))
  const { reload, open } = eventSelection(state, editorLoader)

  const entries = computed(() => parseEntriesText(state.entriesText))
  const targets = computed(() => uploadTargets(state))
  const totalUploadBytes = computed(() =>
    targets.value.reduce((n, r) => n + r.sizeBytes, 0),
  )
  /** イベントを選んでいるか。選ぶまではエントリー・動画を操作できない */
  const selected = computed(() => state.event !== null)
  const currentKey = computed(() => selectedKey(state))
  const canUpload = computed(
    () =>
      selected.value &&
      !!state.remote &&
      targets.value.length > 0 &&
      !state.busy,
  )
  /** すべての動画が R2 にあり、登録できるか */
  const canRegister = computed(
    () =>
      selected.value &&
      state.rows.length > 0 &&
      !state.busy &&
      state.rows.every((r) => rowState(r, state.remote).kind === 'ok'),
  )

  return {
    state,
    /** 登録済みのイベントの一覧 (一覧そのものは state.registeredEvents) */
    events: { reload },
    entries,
    targets,
    totalUploadBytes,
    selected,
    currentKey,
    canUpload,
    canRegister,
    /** 登録済みのイベントを開く。key が空なら選んだイベントを外し、一覧になければそのことを知らせる */
    open,
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
