// イベントの登録画面。utils/adminEvents/ の関数に、reactive にした状態を渡し、画面から呼べる形に束ねる。
// 画面からは composables の provideAdminEventForm を通して使う (テストと Storybook はここから直接作る)
import { computed, type InjectionKey, reactive } from 'vue'
import { idsValid } from '~/utils/adminCommon/eventKey'
import { isId } from '~~/shared/utils/id'
import { fillSeriesName, open, reloadList, remove, save } from './actions'
import { createEventFormState, type EventFormState } from './state'

export type AdminEventForm = ReturnType<typeof createAdminEventForm>

/** provide / inject するキー。Storybook では、状態を作り込んだものをこれで渡す */
export const adminEventFormKey: InjectionKey<AdminEventForm> =
  Symbol('adminEventForm')

export function createAdminEventForm(onUnauthorized: () => void) {
  const state: EventFormState = reactive(createEventFormState(onUnauthorized))

  const canSave = computed(() => idsValid(state.form) && !state.busy)
  /** 書きかけの ID に、使えない文字があるか (空のあいだは出さない) */
  const showIdWarning = computed(() => {
    const { seriesId, eventId } = state.form
    return [seriesId, eventId].some((id) => id !== '' && !isId(id))
  })
  /** 登録済みのシリーズ (シリーズ ID の候補に出す) */
  const seriesList = computed(() => {
    const byId = new Map(state.list.map((e) => [e.seriesId, e.seriesName]))
    return [...byId].map(([id, name]) => ({ id, name }))
  })

  return {
    state,
    canSave,
    showIdWarning,
    seriesList,
    reload: () => reloadList(state),
    open: (key: string) => open(state, key),
    fillSeriesName: () => fillSeriesName(state),
    save: () => save(state),
    remove: () => remove(state),
  }
}
