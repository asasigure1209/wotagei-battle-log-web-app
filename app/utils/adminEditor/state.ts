// 管理画面のエディターの状態と、どの操作からも使う共通の処理。
// Vue に依存しない関数として書き、画面 (composables/useAdminEventEditor.ts) は状態を reactive にして渡す

import { adminErrorMessages, isUnauthorized } from '~/composables/useAdminApi'
import { isId } from '~~/shared/utils/id'

/** 動画の 1 行。file はこの画面で選んだファイル (DB から読んだだけの行にはない) */
export type VideoRow = {
  id: number
  /** イベントの中での相対パス (予選/M1256.mp4)。キーは `<シリーズID>/<イベントID>/<relPath>` */
  relPath: string
  file?: File
  durationSec: number | null
  sizeBytes: number
  performersText: string
  /** 送れたバイト数 (送っている間だけ) */
  sentBytes: number | null
  error: string
}

export type EventForm = {
  seriesId: string
  seriesName: string
  eventId: string
  eventName: string
  date: string
  contact: string
}

export type EditorMessages = { kind: 'error' | 'info'; lines: string[] }

export type EditorState = {
  form: EventForm
  entriesText: string
  rows: VideoRow[]
  /** R2 にある動画 (相対パス → サイズ)。まだ調べていなければ null */
  remote: Map<string, number> | null
  /** 読み込んだ登録済みのイベント (`シリーズID/イベントID`)。新しく作っているときは null */
  loadedKey: string | null
  messages: EditorMessages | null
  /** API を待っているか */
  busy: boolean
  /** アップロードしている間だけある (中止に使う) */
  uploadAbort: AbortController | null
  /** ログインが切れたときに呼ぶ */
  onUnauthorized: () => void
}

export function emptyForm(): EventForm {
  return {
    seriesId: '',
    seriesName: '',
    eventId: '',
    eventName: '',
    date: '',
    contact: '',
  }
}

export function createEditorState(onUnauthorized: () => void): EditorState {
  return {
    form: emptyForm(),
    entriesText: '',
    rows: [],
    remote: null,
    loadedKey: null,
    messages: null,
    busy: false,
    uploadAbort: null,
    onUnauthorized,
  }
}

let nextRowId = 1

export function newRow(
  relPath: string,
  init: Partial<VideoRow> = {},
): VideoRow {
  return {
    id: nextRowId++,
    relPath,
    durationSec: null,
    sizeBytes: 0,
    performersText: '',
    sentBytes: null,
    error: '',
    ...init,
  }
}

/** `シリーズID/イベントID`。登録済みのイベントを見分けるのに使う */
export function eventKey(ids: { seriesId: string; eventId: string }) {
  return `${ids.seriesId}/${ids.eventId}`
}

/** 動画のキーの、相対パスの前に付く部分 (`シリーズID/イベントID/`) */
export function eventPrefix(state: EditorState) {
  return `${eventKey(state.form)}/`
}

export function idsValid(state: EditorState) {
  return isId(state.form.seriesId) && isId(state.form.eventId)
}

export function info(state: EditorState, ...lines: string[]) {
  state.messages = { kind: 'info', lines }
}

export function showErrors(state: EditorState, lines: string[]) {
  state.messages = { kind: 'error', lines }
}

/** busy にしてから fn を動かし、失敗したら画面にエラーを出す (ログインが切れていたらログインの画面に戻す) */
export async function run(state: EditorState, fn: () => Promise<void>) {
  state.busy = true
  try {
    await fn()
    return true
  } catch (error) {
    if (isUnauthorized(error)) state.onUnauthorized()
    showErrors(state, adminErrorMessages(error))
    return false
  } finally {
    state.busy = false
  }
}
