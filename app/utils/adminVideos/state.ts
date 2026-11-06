// 動画の登録画面 (エディター) の状態。
// Vue に依存しない関数として書き、エディター (editor.ts) が状態を reactive にして渡す
import {
  createEventSelectionState,
  type EventSelectionState,
} from '~/utils/adminCommon/eventSelection'
import type { Manifest } from '~~/server/db/manifest'
import type { Performers } from './performers'

/** 動画の 1 行。file はこの画面で選んだファイル (DB から読んだだけの行にはない) */
export type VideoRow = {
  id: number
  /** イベントの中での相対パス (予選/M1256.mp4)。キーは `<シリーズID>/<イベントID>/<relPath>` */
  relPath: string
  file?: File
  durationSec: number | null
  sizeBytes: number
  /** 出演者 1・2 のエントリー No. (選んでいなければ null) */
  performers: Performers
  /** 送れたバイト数 (送っている間だけ) */
  sentBytes: number | null
  error: string
}

/**
 * 動画の登録画面の状態。選んだ登録済みのイベント (EventSelectionState の event) に、動画と出演者を登録する。
 * この画面ではイベントの情報とエントリーは書き換えない
 */
export type VideoEditorState = EventSelectionState & {
  /** 選んだイベントに登録済みのエントリー (読み込んだまま書き換えない)。出演者はここから選ぶ */
  entries: Manifest['entries']
  rows: VideoRow[]
  /** R2 にある動画 (相対パス → サイズ)。まだ調べていなければ null */
  remote: Map<string, number> | null
  /** アップロードしている間だけある (中止に使う) */
  uploadAbort: AbortController | null
}

export function createVideoEditorState(
  onUnauthorized: () => void,
): VideoEditorState {
  return {
    ...createEventSelectionState(onUnauthorized),
    entries: [],
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
    performers: [null, null],
    sentBytes: null,
    error: '',
    ...init,
  }
}
