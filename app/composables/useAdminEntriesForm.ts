// エントリーの登録画面を、親 (AdminEntriesRegistration) が provideAdminEntriesForm で作って渡し、
// 子は useAdminEntriesForm で受け取る。中身は utils/adminEntries/form.ts
import { inject, onMounted, provide } from 'vue'
import {
  adminEntriesFormKey,
  createAdminEntriesForm,
} from '~/utils/adminEntries/form'

/**
 * 作って子のコンポーネントに渡す。onUnauthorized はログインが切れたときに呼ぶ。
 * initialEvent (`シリーズID/イベントID`) があれば、一覧を読んだあとに選ぶ (一覧を読めなければ選ばない)
 */
export function provideAdminEntriesForm(
  onUnauthorized: () => void,
  initialEvent = '',
) {
  const form = createAdminEntriesForm(onUnauthorized)
  provide(adminEntriesFormKey, form)
  onMounted(() => form.start(initialEvent))
  return form
}

/** 親 (provideAdminEntriesForm) が作ったものを受け取る */
export function useAdminEntriesForm() {
  const form = inject(adminEntriesFormKey)
  if (!form) throw new Error('provideAdminEntriesForm の中で使ってください')
  return form
}
