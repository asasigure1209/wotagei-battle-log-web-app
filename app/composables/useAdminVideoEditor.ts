// 動画の登録画面のエディターを、親 (AdminVideoEditor) が provideAdminVideoEditor で作って渡し、
// 各セクションは useAdminVideoEditor で受け取る。エディターそのものは utils/adminVideos/editor.ts
import { inject, onMounted, provide } from 'vue'
import {
  adminVideoEditorKey,
  createAdminVideoEditor,
} from '~/utils/adminVideos/editor'

/**
 * エディターを作り、子のコンポーネントに渡す。onUnauthorized はログインが切れたときに呼ぶ。
 * initialEvent (`シリーズID/イベントID`) があれば、一覧を読んだあとに選ぶ (一覧を読めなければ選ばない)
 */
export function provideAdminVideoEditor(
  onUnauthorized: () => void,
  initialEvent = '',
) {
  const editor = createAdminVideoEditor(onUnauthorized)
  provide(adminVideoEditorKey, editor)
  onMounted(() => editor.start(initialEvent))
  return editor
}

/** 親 (provideAdminVideoEditor) が作ったエディターを受け取る */
export function useAdminVideoEditor() {
  const editor = inject(adminVideoEditorKey)
  if (!editor) throw new Error('provideAdminVideoEditor の中で使ってください')
  return editor
}
