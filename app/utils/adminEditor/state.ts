// エントリーと動画の登録画面 (エディター) の状態。
// Vue に依存しない関数として書き、エディター (editor.ts) が状態を reactive にして渡す
import type { EventIds } from '~/utils/adminApi'
import {
  createOperationState,
  type OperationState,
} from '~/utils/adminCommon/operation'
import type { Manifest } from '~~/server/db/manifest'

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

/** 選んだイベントの情報 (manifest の series・event と同じ形) */
export type SelectedEvent = Pick<Manifest, 'series' | 'event'>

export type EditorState = OperationState & {
  /** 選んだ登録済みのイベント。この画面ではイベントの情報を書かず、登録のときもこれをそのまま送る */
  event: SelectedEvent | null
  entriesText: string
  rows: VideoRow[]
  /** R2 にある動画 (相対パス → サイズ)。まだ調べていなければ null */
  remote: Map<string, number> | null
  /** アップロードしている間だけある (中止に使う) */
  uploadAbort: AbortController | null
}

export function createEditorState(onUnauthorized: () => void): EditorState {
  return {
    ...createOperationState(onUnauthorized),
    event: null,
    entriesText: '',
    rows: [],
    remote: null,
    uploadAbort: null,
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

/** 選んだイベントの ID の組。選んでいなければ null */
export function selectedIds(state: EditorState): EventIds | null {
  const { event } = state
  return event ? { seriesId: event.series.id, eventId: event.event.id } : null
}
