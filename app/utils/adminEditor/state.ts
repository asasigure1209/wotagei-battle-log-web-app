// 管理画面のエディターの状態。
// Vue に依存しない関数として書き、エディター (editor.ts) が状態を reactive にして渡す

import type { OperationState } from '~/utils/adminCommon/operation'
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

type EventForm = {
  seriesId: string
  seriesName: string
  eventId: string
  eventName: string
  date: string
  contact: string
}

export type EditorState = OperationState & {
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
  /** アップロードしている間だけある (中止に使う) */
  uploadAbort: AbortController | null
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

export function idsValid(state: EditorState) {
  return isId(state.form.seriesId) && isId(state.form.eventId)
}
