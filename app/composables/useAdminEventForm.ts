// イベントの登録の画面 (/admin/events) のエディターを作り、開いたときに登録済みのイベントの一覧を読む。
// エディターそのものは utils/adminEditor/eventForm.ts
import { onMounted } from 'vue'
import { createEventFormEditor } from '~/utils/adminEditor/eventForm'

/** onUnauthorized はログインが切れたときに呼ぶ。initialKey (`シリーズID/イベントID`) があれば、読んだあとにそのイベントを選ぶ */
export function useAdminEventForm(onUnauthorized: () => void, initialKey = '') {
  const editor = createEventFormEditor(onUnauthorized)
  onMounted(async () => {
    if ((await editor.reload()) && initialKey) editor.open(initialKey)
  })
  return editor
}
