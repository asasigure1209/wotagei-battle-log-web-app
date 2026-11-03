// 管理画面のストーリーで使う道具。
// 管理画面のコンポーネントはエディター (useAdminEditor) を inject するので、状態を作り込んだエディターを provide して描く。
// Storybook は Nuxt なしで動き $fetch がないので、API を呼ぶストーリーは stubFetch で差し替える
import type { Decorator } from '@storybook/vue3-vite'
import { provide } from 'vue'
import '../app/assets/css/admin.css'
import {
  type AdminEditor,
  adminEditorKey,
  createAdminEditor,
} from '../app/utils/adminEditor/editor'
import { newRow, type VideoRow } from '../app/utils/adminEditor/state'

/** 管理画面は広い画面で使うので、スマホの幅に収めない */
export const adminParameters = { maxWidth: '1080px' }

/** prepare で状態を作り込んだエディターを、ストーリーのコンポーネントに渡す */
export function withAdminEditor(
  prepare: (editor: AdminEditor) => void = () => {},
): Decorator {
  return (story) => ({
    components: { story },
    setup() {
      const editor = createAdminEditor(() => {})
      prepare(editor)
      provide(adminEditorKey, editor)
    },
    template: '<story />',
  })
}

/** イベントの情報を書いたところ */
export function fillEvent(editor: AdminEditor) {
  Object.assign(editor.state.form, {
    seriesId: 'elnino',
    seriesName: 'エルニーニョ',
    eventId: 'elnino_vol_5',
    eventName: 'エルニーニョ vol.5',
    date: '2026-11-01',
    contact: 'X: @elnino',
  })
  editor.state.entriesText = '1: BLAZE\n2: しぐれ\n3: ヲタ'
}

/** 動画の行。file を渡すと、この画面で選んだファイルの行になる */
export function videoRow(
  relPath: string,
  init: Partial<VideoRow> & { withFile?: boolean } = {},
) {
  const { withFile, ...rest } = init
  return newRow(relPath, {
    durationSec: 192,
    sizeBytes: 742_000_000,
    performersText: '1, 2',
    ...(withFile ? { file: new File([], relPath.split('/').pop() ?? '') } : {}),
    ...rest,
  })
}

/** $fetch を、URL ごとに決めた値を返す (エラーなら投げる) ものに差し替える */
export function stubFetch(respond: (url: string, options?: object) => unknown) {
  ;(globalThis as { $fetch?: unknown }).$fetch = async (
    url: string,
    options?: object,
  ) => {
    const result = respond(url, options)
    if (result instanceof Error) throw result
    return result
  }
}

/** $fetch が投げる、API のエラーと同じ形の値 */
export function fetchError(statusCode: number, message: string) {
  return Object.assign(new Error(message), {
    statusCode,
    data: { message },
  })
}
