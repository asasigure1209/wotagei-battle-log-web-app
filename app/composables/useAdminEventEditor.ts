// 管理画面のエントリー・動画の登録のエディターを、親 (AdminContentsEditor) が provideAdminEditor で作って渡し、
// 各セクションは useAdminEditor で受け取る。エディターそのものは utils/adminEditor/editor.ts
import { inject, onMounted, provide } from 'vue'
import { adminEditorKey, createAdminEditor } from '~/utils/adminEditor/editor'

/**
 * エディターを作り、子のコンポーネントに渡す。onUnauthorized はログインが切れたときに呼ぶ。
 * 開いたときに登録済みのイベントの一覧を読み、initialKey (`シリーズID/イベントID`) が一覧にあれば、そのイベントを読み込む
 */
export function provideAdminEditor(
  onUnauthorized: () => void,
  initialKey = '',
) {
  const editor = createAdminEditor(onUnauthorized)
  provide(adminEditorKey, editor)
  onMounted(async () => {
    await editor.events.reload()
    if (initialKey && editor.events.has(initialKey)) {
      await editor.open(initialKey)
    }
  })
  return editor
}

/** 親 (provideAdminEditor) が作ったエディターを受け取る */
export function useAdminEditor() {
  const editor = inject(adminEditorKey)
  if (!editor) throw new Error('provideAdminEditor の中で使ってください')
  return editor
}
