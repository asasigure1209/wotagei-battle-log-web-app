// エントリーの登録画面。utils/adminEntries/ の関数に、reactive にした状態を渡し、画面から呼べる形に束ねる。
// 画面からは composables の provideAdminEntriesForm を通して使う (テストと Storybook はここから直接作る)
import { computed, type InjectionKey, reactive } from 'vue'
import { eventSelection, selectedKey } from '~/utils/adminCommon/eventSelection'
import { parseEntryNames } from '~/utils/adminManifest'
import { entriesLoader, save } from './actions'
import { createEntriesFormState, type EntriesFormState } from './state'

export type AdminEntriesForm = ReturnType<typeof createAdminEntriesForm>

/** provide / inject するキー。Storybook では、状態を作り込んだものをこれで渡す */
export const adminEntriesFormKey: InjectionKey<AdminEntriesForm> =
  Symbol('adminEntriesForm')

export function createAdminEntriesForm(onUnauthorized: () => void) {
  const state: EntriesFormState = reactive(
    createEntriesFormState(onUnauthorized),
  )
  const { reload, open, start } = eventSelection(state, entriesLoader)

  /** 書いた名前。エントリー No. はこの順に 1 から付く */
  const names = computed(() => parseEntryNames(state.namesText))
  /** イベントを選んでいるか。選ぶまではエントリーを書けない */
  const selected = computed(() => state.event !== null)
  const currentKey = computed(() => selectedKey(state))
  const canSave = computed(
    () => selected.value && names.value.length > 0 && !state.busy,
  )

  return {
    state,
    names,
    selected,
    currentKey,
    canSave,
    /** 登録済みのイベントの一覧を読み直す (一覧そのものは state.registeredEvents) */
    reload,
    /** 画面を開いたときに呼ぶ。一覧を読み、initialEvent があれば開く (一覧を読めなければ開かない) */
    start,
    /** 登録済みのイベントを開く。key が空なら選んだイベントを外し、一覧になければそのことを知らせる */
    open,
    /** 登録する (dryRun なら確かめるだけ) */
    save: (dryRun: boolean) => save(state, dryRun),
  }
}
