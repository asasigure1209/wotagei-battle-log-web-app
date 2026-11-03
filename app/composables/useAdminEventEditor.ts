// 管理画面のエディターを、親 (AdminEventEditor) が provideAdminEditor で作って渡し、各セクションは useAdminEditor で受け取る。
// エディターそのものは utils/adminEditor/editor.ts
import { inject, onMounted, provide } from 'vue'
import { adminEditorKey, createAdminEditor } from '~/utils/adminEditor/editor'

/** エディターを作り、子のコンポーネントに渡す。onUnauthorized はログインが切れたときに呼ぶ */
export function provideAdminEditor(onUnauthorized: () => void) {
  const editor = createAdminEditor(onUnauthorized)
  provide(adminEditorKey, editor)
  onMounted(editor.events.reload)
  return editor
}

/** 親 (provideAdminEditor) が作ったエディターを受け取る */
export function useAdminEditor() {
  const editor = inject(adminEditorKey)
  if (!editor) throw new Error('provideAdminEditor の中で使ってください')
  return editor
}
