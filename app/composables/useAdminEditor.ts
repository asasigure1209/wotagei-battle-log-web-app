// エントリーと動画の登録画面のエディターを、親 (AdminEntriesEditor) が provideAdminEditor で作って渡し、
// 各セクションは useAdminEditor で受け取る。エディターそのものは utils/adminEditor/editor.ts
import { inject, onMounted, provide } from 'vue'
import { adminEditorKey, createAdminEditor } from '~/utils/adminEditor/editor'

/**
 * エディターを作り、子のコンポーネントに渡す。onUnauthorized はログインが切れたときに呼ぶ。
 * initialEvent (`シリーズID/イベントID`) が登録済みのイベントなら、開いたときに選ぶ
 */
export function provideAdminEditor(
  onUnauthorized: () => void,
  initialEvent = '',
) {
  const editor = createAdminEditor(onUnauthorized)
  provide(adminEditorKey, editor)
  onMounted(async () => {
    await editor.events.reload()
    if (editor.events.has(initialEvent)) await editor.open(initialEvent)
  })
  return editor
}

/** 親 (provideAdminEditor) が作ったエディターを受け取る */
export function useAdminEditor() {
  const editor = inject(adminEditorKey)
  if (!editor) throw new Error('provideAdminEditor の中で使ってください')
  return editor
}
