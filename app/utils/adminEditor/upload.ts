// R2 にある動画の確認と、この画面で選んだ動画のアップロード
import { adminApi, adminUploadDeps, type EventIds } from '~/utils/adminApi'
import { eventPrefix } from '~/utils/adminCommon/eventKey'
import { info, run } from '~/utils/adminCommon/operation'
import { uploadMultipart } from '~/utils/multipartUpload'
import { needsUpload } from './rows'
import { type EditorState, idsValid, type VideoRow } from './state'

/** 送信中の進み具合を画面に反映する間隔 */
const PROGRESS_INTERVAL_MS = 200

/** イベントの R2 にある動画 (相対パス → サイズ) */
export async function fetchRemote(ids: EventIds) {
  const objects = await adminApi.listObjects(ids)
  const prefix = eventPrefix(ids)
  return new Map(objects.map((o) => [o.key.slice(prefix.length), o.size]))
}

export async function refreshRemote(state: EditorState) {
  state.remote = null
  if (!idsValid(state)) return
  const ids = { ...state.form }
  await run(state, async () => {
    state.remote = await fetchRemote(ids)
  })
}

/** アップロードが要る行 */
export function uploadTargets(state: EditorState) {
  return state.rows.filter((r) => needsUpload(r, state.remote))
}

export async function uploadAll(state: EditorState) {
  if (!idsValid(state) || !state.remote) return
  state.messages = null
  const abort = new AbortController()
  state.uploadAbort = abort
  const targets = uploadTargets(state)
  const ok = await run(state, async () => {
    for (const row of targets) await uploadRow(state, row, abort.signal)
  })
  state.uploadAbort = null
  if (ok) info(state, `${targets.length} 本アップロードしました`)
}

async function uploadRow(
  state: EditorState,
  row: VideoRow,
  signal: AbortSignal,
) {
  const { file } = row
  if (!file) return
  row.sentBytes = 0
  row.error = ''
  try {
    await uploadMultipart(
      file,
      eventPrefix(state.form) + row.relPath,
      throttledProgress(row),
      adminUploadDeps,
      signal,
    )
    state.remote?.set(row.relPath, file.size)
  } catch (error) {
    row.error = signal.aborted ? '中止しました' : 'アップロード失敗'
    throw error
  } finally {
    row.sentBytes = null
  }
}

/** 送れたバイト数は XHR から細かく届くので、画面を描き直しすぎないよう間引いて行に反映する */
function throttledProgress(row: VideoRow) {
  let shownAt = 0
  return (bytes: number) => {
    const now = Date.now()
    if (now - shownAt < PROGRESS_INTERVAL_MS) return
    shownAt = now
    row.sentBytes = bytes
  }
}

export function cancelUpload(state: EditorState) {
  state.uploadAbort?.abort()
}
