// エントリーの登録画面を、親 (AdminEntriesRegistration) が provideAdminEntriesForm で作って渡し、
// 子は useAdminEntriesForm で受け取る。中身は utils/adminEntries/form.ts
import { inject, onMounted, provide } from 'vue'
import {
  adminEntriesFormKey,
  createAdminEntriesForm,
} from '~/utils/adminEntries/form'

/**
 * 作って子のコンポーネントに渡す。onUnauthorized はログインが切れたときに呼ぶ。
 * initialEvent (`シリーズID/イベントID`) があれば、一覧を読んだあとに選ぶ
 */
export function provideAdminEntriesForm(
  onUnauthorized: () => void,
  initialEvent = '',
) {
  const form = createAdminEntriesForm(onUnauthorized)
  provide(adminEntriesFormKey, form)
  onMounted(async () => {
    await form.reload()
    // 一覧を読む間は選べない (選択肢がなく、読み終わるまで busy) ので、自分で選んだものを上書きすることはない
    if (initialEvent) await form.open(initialEvent)
  })
  return form
}

/** 親 (provideAdminEntriesForm) が作ったものを受け取る */
export function useAdminEntriesForm() {
  const form = inject(adminEntriesFormKey)
  if (!form) throw new Error('provideAdminEntriesForm の中で使ってください')
  return form
}
