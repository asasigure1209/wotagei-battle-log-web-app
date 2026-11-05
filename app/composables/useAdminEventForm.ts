// イベントの登録画面を、親 (AdminEventRegistration) が provideAdminEventForm で作って渡し、
// 子は useAdminEventForm で受け取る。中身は utils/adminEvents/form.ts
import { inject, onMounted, provide } from 'vue'
import {
  adminEventFormKey,
  createAdminEventForm,
} from '~/utils/adminEvents/form'

/**
 * 作って子のコンポーネントに渡す。onUnauthorized はログインが切れたときに呼ぶ。
 * initialEvent (`シリーズID/イベントID`) が登録済みのイベントなら、開いたときに選ぶ
 */
export function provideAdminEventForm(
  onUnauthorized: () => void,
  initialEvent = '',
) {
  const form = createAdminEventForm(onUnauthorized)
  provide(adminEventFormKey, form)
  onMounted(async () => {
    await form.reload()
    if (initialEvent) form.open(initialEvent)
  })
  return form
}

/** 親 (provideAdminEventForm) が作ったものを受け取る */
export function useAdminEventForm() {
  const form = inject(adminEventFormKey)
  if (!form) throw new Error('provideAdminEventForm の中で使ってください')
  return form
}
