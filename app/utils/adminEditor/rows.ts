// 動画の行の操作 (ファイルを足す・外す・並べ替える) と、行の状態 (R2 にあるか、送信中か) の判定

import { compareRelPath, relPathOf } from '~/utils/adminManifest'
import { readMp4Duration } from '~/utils/mp4Duration'
import { isVideoRelPath } from '~~/shared/utils/video-key'
import { type EditorState, info, newRow, type VideoRow } from './state'

type RowState = {
  kind: 'ok' | 'pending' | 'uploading' | 'error' | 'unknown'
  label: string
}

/** 選んだファイルを足す。同じ相対パスの行があれば、出演者はそのままでファイルを付け替える */
export async function addFiles(
  state: EditorState,
  files: File[],
  category: string,
) {
  const videos = files
    .map((file) => ({ file, relPath: relPathOf(file, category) }))
    .filter((v) => isVideoRelPath(v.relPath))
  // 長さはファイルの頭と moov の先頭だけを読むので、まとめて読む
  const withDurations = await Promise.all(
    videos.map(async (v) => ({
      ...v,
      durationSec: await readMp4Duration(v.file),
    })),
  )
  for (const video of withDurations) upsertRow(state, video)
  sortRows(state)
  const skipped = files.length - videos.length
  if (skipped) info(state, `.mp4 ではないファイルを ${skipped} 個とばしました`)
}

/** 同じ相対パスの行があればファイルを付け替え、なければ足す */
function upsertRow(
  state: EditorState,
  video: { file: File; relPath: string; durationSec: number | null },
) {
  const { file, relPath, durationSec } = video
  const found = state.rows.find((r) => r.relPath === relPath)
  const row = found ?? newRow(relPath)
  Object.assign(row, { file, durationSec, sizeBytes: file.size, error: '' })
  if (!found) state.rows.push(row)
}

/** 行の長さ・出演者を書き換える */
export function updateRow(
  state: EditorState,
  id: number,
  patch: Partial<Pick<VideoRow, 'durationSec' | 'performersText'>>,
) {
  const row = state.rows.find((r) => r.id === id)
  if (row) Object.assign(row, patch)
}

export function removeRow(state: EditorState, id: number) {
  state.rows = state.rows.filter((r) => r.id !== id)
}

/** 行を delta だけ動かす (-1 で上へ、1 で下へ)。端を越えるときは動かさない */
export function moveRow(state: EditorState, id: number, delta: number) {
  const from = state.rows.findIndex((r) => r.id === id)
  const to = from + delta
  if (from < 0 || to < 0 || to >= state.rows.length) return
  const [row] = state.rows.splice(from, 1)
  if (row) state.rows.splice(to, 0, row)
}

/** パスの順に並べる (並び順がイベントの中での動画の No. になる) */
export function sortRows(state: EditorState) {
  state.rows.sort((a, b) => compareRelPath(a.relPath, b.relPath))
}

export function rowState(
  row: VideoRow,
  remote: Map<string, number> | null,
): RowState {
  if (row.sentBytes !== null) {
    const percent = Math.floor((row.sentBytes / (row.sizeBytes || 1)) * 100)
    return { kind: 'uploading', label: `送信中 ${percent}%` }
  }
  if (row.error) return { kind: 'error', label: row.error }
  return remote
    ? remoteState(row, remote)
    : { kind: 'unknown', label: '未確認' }
}

/** この画面で選んだファイルで、R2 にまだない、またはサイズが違う (アップロードが要る) か */
export function needsUpload(row: VideoRow, remote: Map<string, number> | null) {
  return !!row.file && remote?.get(row.relPath) !== row.sizeBytes
}

function remoteState(row: VideoRow, remote: Map<string, number>): RowState {
  const size = remote.get(row.relPath)
  if (size === row.sizeBytes) return { kind: 'ok', label: 'R2 にあり' }
  if (!needsUpload(row, remote)) return { kind: 'error', label: 'R2 にない' }
  if (size === undefined) return { kind: 'pending', label: '未アップロード' }
  return { kind: 'pending', label: 'R2 と違う (上書き)' }
}
