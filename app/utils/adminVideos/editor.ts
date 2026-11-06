// 動画の登録画面のエディター。utils/adminVideos/ の関数に、reactive にした状態を渡し、画面から呼べる形に束ねる。
// Nuxt が自動 import しない utils/ の下の階層に置き、画面からは composables の provideAdminVideoEditor を通して使う
// (テストと Storybook はここから直接作る)
import { computed, type InjectionKey, reactive } from 'vue'
import { eventSelection, selectedKey } from '~/utils/adminCommon/eventSelection'
import { editorLoader, register } from './registration'
import {
  addFiles,
  moveRow,
  removeRow,
  rowState,
  sortRows,
  updateRow,
} from './rows'
import { createVideoEditorState, type VideoEditorState } from './state'
import { cancelUpload, refreshRemote, uploadAll, uploadTargets } from './upload'

export type AdminVideoEditor = ReturnType<typeof createAdminVideoEditor>

/** エディターを provide / inject するキー。Storybook では、状態を作り込んだエディターをこれで渡す */
export const adminVideoEditorKey: InjectionKey<AdminVideoEditor> =
  Symbol('adminVideoEditor')

/** エディターを作る。画面からは composables の provideAdminVideoEditor を通して使う */
export function createAdminVideoEditor(onUnauthorized: () => void) {
  const state: VideoEditorState = reactive(
    createVideoEditorState(onUnauthorized),
  )
  const { reload, open, start } = eventSelection(state, editorLoader)

  const targets = computed(() => uploadTargets(state))
  const totalUploadBytes = computed(() =>
    targets.value.reduce((n, r) => n + r.sizeBytes, 0),
  )
  /** イベントを選んでいるか。選ぶまでは動画を操作できない */
  const selected = computed(() => state.event !== null)
  /** 選んだイベントにエントリーが登録済みか。ないあいだは出演者を選べず、登録できない */
  const hasEntries = computed(() => state.entries.length > 0)
  const currentKey = computed(() => selectedKey(state))
  const canUpload = computed(
    () =>
      selected.value &&
      !!state.remote &&
      targets.value.length > 0 &&
      !state.busy,
  )
  /** エントリーが登録済みで、すべての動画が R2 にあり、登録できるか */
  const canRegister = computed(
    () =>
      selected.value &&
      hasEntries.value &&
      state.rows.length > 0 &&
      !state.busy &&
      state.rows.every((r) => rowState(r, state.remote).kind === 'ok'),
  )

  return {
    state,
    /** 登録済みのイベントの一覧 (一覧そのものは state.registeredEvents) */
    events: { reload },
    targets,
    totalUploadBytes,
    selected,
    hasEntries,
    currentKey,
    canUpload,
    canRegister,
    /** 登録済みのイベントを開く。key が空なら選んだイベントを外し、一覧になければそのことを知らせる */
    open,
    /** 画面を開いたときに呼ぶ。一覧を読み、initialEvent があれば開く (一覧を読めなければ開かない) */
    start,
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
