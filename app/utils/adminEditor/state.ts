// 管理画面のエディターの状態と、どの操作からも使う共通の処理。
// Vue に依存しない関数として書き、エディター (editor.ts) が状態を reactive にして渡す

import {
  adminErrorMessages,
  type EventIds,
  isUnauthorized,
} from '~/utils/adminApi'
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
  /**
   * 登録済みのイベントを読み込んでいるか (または登録したか)。そのあいだは ID を変えられないので、
   * どのイベントかはフォームの ID でわかる
   */
  loaded: boolean
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
    loaded: false,
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

/** `シリーズID/イベントID`。登録済みのイベントの選択肢の値などに使う */
export function eventKey(ids: EventIds) {
  return `${ids.seriesId}/${ids.eventId}`
}

/** eventKey の逆 */
export function parseEventKey(key: string): EventIds {
  const [seriesId = '', eventId = ''] = key.split('/')
  return { seriesId, eventId }
}

/** 動画のキーの、相対パスの前に付く部分 (`シリーズID/イベントID/`) */
export function eventPrefix(ids: EventIds) {
  return `${eventKey(ids)}/`
}

export function idsValid(state: EditorState) {
  return isId(state.form.seriesId) && isId(state.form.eventId)
}

/** 知らせ・待っているか・ログイン切れの扱いを持つ状態。イベントの登録の画面 (eventForm.ts) とも共通に使う */
export type RunState = Pick<EditorState, 'messages' | 'busy' | 'onUnauthorized'>

export function info(state: RunState, ...lines: string[]) {
  state.messages = { kind: 'info', lines }
}

export function showErrors(state: RunState, lines: string[]) {
  state.messages = { kind: 'error', lines }
}

/** busy にしてから fn を動かし、失敗したら画面にエラーを出す (ログインが切れていたらログインの画面に戻す) */
export async function run(state: RunState, fn: () => Promise<void>) {
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
