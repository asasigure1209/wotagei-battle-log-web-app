// 管理画面で、1 つのイベントの情報・エントリー・動画を書き、動画を R2 に送り、DB に取り込むまでの状態
import { computed, markRaw, reactive } from 'vue'
import type { Manifest } from '~~/server/db/manifest'
import { isId } from '~~/shared/utils/id'
import { isVideoRelPath } from '~~/shared/utils/video-key'

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

export type RowState = {
  kind: 'ok' | 'pending' | 'uploading' | 'error' | 'unknown'
  label: string
}

/** 登録済みのイベント (GET /api/admin/events/:series/:event)。manifest と同じ形 */
type AdminEvent = Manifest

export type EditorState = {
  form: ReturnType<typeof emptyForm>
  entriesText: string
  rows: VideoRow[]
  /** R2 にある動画 (相対パス → サイズ)。まだ調べていなければ null */
  remote: Map<string, number> | null
  messages: { kind: 'error' | 'info'; lines: string[] } | null
  /** API を待っているか */
  busy: boolean
  /** アップロードしている間だけある (中止に使う) */
  uploadAbort: AbortController | null
  /** ログインが切れたときに呼ぶ */
  onUnauthorized: () => void
}

function emptyForm() {
  return {
    seriesId: '',
    seriesName: '',
    eventId: '',
    eventName: '',
    date: '',
    contact: '',
  }
}

let nextRowId = 1

function newRow(relPath: string, init: Partial<VideoRow> = {}): VideoRow {
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

function eventPrefix(state: EditorState) {
  return `${state.form.seriesId}/${state.form.eventId}/`
}

function idsValid(state: EditorState) {
  return isId(state.form.seriesId) && isId(state.form.eventId)
}

function info(state: EditorState, ...lines: string[]) {
  state.messages = { kind: 'info', lines }
}

/** busy にしてから fn を動かし、失敗したら画面にエラーを出す (ログインが切れていたらログインの画面に戻す) */
async function run(state: EditorState, fn: () => Promise<void>) {
  state.busy = true
  try {
    await fn()
    return true
  } catch (error) {
    if (isUnauthorized(error)) state.onUnauthorized()
    state.messages = { kind: 'error', lines: adminErrorMessages(error) }
    return false
  } finally {
    state.busy = false
  }
}

/** 選んだファイルを足す。同じ相対パスの行があれば、出演者はそのままでファイルを付け替える */
async function addFiles(state: EditorState, files: File[], category: string) {
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

function removeRow(state: EditorState, id: number) {
  state.rows = state.rows.filter((r) => r.id !== id)
}

function moveRow(state: EditorState, id: number, delta: number) {
  const from = state.rows.findIndex((r) => r.id === id)
  const to = from + delta
  if (from < 0 || to < 0 || to >= state.rows.length) return
  const [row] = state.rows.splice(from, 1)
  if (row) state.rows.splice(to, 0, row)
}

function sortRows(state: EditorState) {
  state.rows.sort((a, b) => compareRelPath(a.relPath, b.relPath))
}

/** イベントの R2 にある動画 (相対パス → サイズ) */
async function fetchRemote(series: string, event: string) {
  const objects = await $fetch<{ key: string; size: number }[]>(
    '/api/admin/objects',
    { query: { series, event } },
  )
  const prefix = `${series}/${event}/`
  return new Map(objects.map((o) => [o.key.slice(prefix.length), o.size]))
}

async function refreshRemote(state: EditorState) {
  state.remote = null
  if (!idsValid(state)) return
  const { seriesId, eventId } = state.form
  await run(state, async () => {
    state.remote = await fetchRemote(seriesId, eventId)
  })
}

function rowState(row: VideoRow, remote: Map<string, number> | null): RowState {
  if (row.sentBytes !== null) {
    const percent = Math.floor((row.sentBytes / (row.sizeBytes || 1)) * 100)
    return { kind: 'uploading', label: `送信中 ${percent}%` }
  }
  if (row.error) return { kind: 'error', label: row.error }
  return remote
    ? remoteState(row, remote)
    : { kind: 'unknown', label: '未確認' }
}

function remoteState(row: VideoRow, remote: Map<string, number>): RowState {
  const size = remote.get(row.relPath)
  if (size === row.sizeBytes) return { kind: 'ok', label: 'R2 にあり' }
  if (!row.file) return { kind: 'error', label: 'R2 にない' }
  if (size === undefined) return { kind: 'pending', label: '未アップロード' }
  return { kind: 'pending', label: 'R2 と違う (上書き)' }
}

/** この画面で選んだファイルのうち、R2 にまだない、またはサイズが違うもの */
function uploadTargets(state: EditorState) {
  return state.rows.filter(
    (r) => r.file && state.remote?.get(r.relPath) !== r.sizeBytes,
  )
}

async function uploadAll(state: EditorState) {
  if (!idsValid(state) || !state.remote) return
  state.messages = null
  const abort = markRaw(new AbortController())
  state.uploadAbort = abort
  const targets = uploadTargets(state)
  const ok = await run(state, async () => {
    for (const row of targets) await uploadRow(state, row, abort.signal)
  })
  state.uploadAbort = null
  if (ok) info(state, `${targets.length} 本アップロードしました`)
}

/** 送信中の進み具合を画面に反映する間隔 */
const PROGRESS_INTERVAL_MS = 200

async function uploadRow(
  state: EditorState,
  row: VideoRow,
  signal: AbortSignal,
) {
  const { file } = row
  if (!file) return
  row.sentBytes = 0
  row.error = ''
  // 送れたバイト数は XHR から細かく届くので、画面を描き直しすぎないよう間引いて反映する
  let shownAt = 0
  try {
    await uploadMultipart(
      file,
      eventPrefix(state) + row.relPath,
      (bytes) => {
        const now = Date.now()
        if (now - shownAt < PROGRESS_INTERVAL_MS) return
        shownAt = now
        row.sentBytes = bytes
      },
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

function cancelUpload(state: EditorState) {
  state.uploadAbort?.abort()
}

/** 動画の 1 行を manifest の形にする。出演者・長さの書き方の誤りは problems に足す */
function manifestVideo(row: VideoRow, prefix: string, problems: string[]) {
  const performers = parsePerformers(row.performersText)
  if (!performers) {
    problems.push(`出演は No. をカンマで区切って書いてください: ${row.relPath}`)
  }
  if (row.durationSec === null || Number.isNaN(row.durationSec)) {
    problems.push(`長さ (秒) を書いてください: ${row.relPath}`)
  }
  return {
    key: prefix + row.relPath,
    durationSec: row.durationSec ?? 0,
    sizeBytes: row.sizeBytes,
    performers: performers ?? [],
  }
}

/** 送る内容 (manifest の YAML を読んだ値と同じ形) と、送る前に見つかった誤り */
function buildManifest(state: EditorState) {
  const { entries, problems } = parseEntriesText(state.entriesText)
  const prefix = eventPrefix(state)
  const videos = state.rows.map((row) => manifestVideo(row, prefix, problems))
  const { form } = state
  const manifest = {
    series: { id: form.seriesId, name: form.seriesName },
    event: {
      id: form.eventId,
      name: form.eventName,
      date: form.date,
      contact: form.contact,
    },
    entries,
    videos,
  }
  return { manifest, problems }
}

async function register(state: EditorState, dryRun: boolean) {
  const { manifest, problems } = buildManifest(state)
  if (problems.length) {
    state.messages = { kind: 'error', lines: problems }
    return false
  }
  const ok = await run(state, async () => {
    await $fetch('/api/admin/events', {
      method: 'POST',
      body: manifest,
      query: dryRun ? { dryRun: 1 } : {},
    })
  })
  if (ok) info(state, dryRun ? DRY_RUN_OK : REGISTERED)
  return ok
}

const DRY_RUN_OK = '問題ありません。このまま登録できます'
const REGISTERED =
  '登録しました。公開ページは最大 1 時間とっておかれるので、すぐに出したいときは Vercel で本番を再デプロイしてください'

async function loadEvent(state: EditorState, series: string, event: string) {
  state.messages = null
  state.remote = null
  await run(state, async () => {
    // 2 つは別々に引けるので、待ち合わせずに並べて引く
    const [data, remote] = await Promise.all([
      $fetch<AdminEvent>(`/api/admin/events/${series}/${event}`),
      fetchRemote(series, event),
    ])
    fill(state, data)
    state.remote = remote
  })
}

/** 登録済みのイベントを、画面に書き写す */
function fill(state: EditorState, data: AdminEvent) {
  state.form = {
    seriesId: data.series.id,
    seriesName: data.series.name,
    eventId: data.event.id,
    eventName: data.event.name,
    date: data.event.date,
    contact: data.event.contact,
  }
  state.entriesText = formatEntriesText(data.entries)
  const prefix = eventPrefix(state)
  state.rows = data.videos.map((v) =>
    newRow(v.key.slice(prefix.length), {
      durationSec: v.durationSec,
      sizeBytes: v.sizeBytes,
      performersText: v.performers.join(', '),
    }),
  )
}

function reset(state: EditorState) {
  state.form = emptyForm()
  state.entriesText = ''
  state.rows = []
  state.remote = null
  state.messages = null
}

async function deleteEvent(state: EditorState) {
  const { seriesId, eventId } = state.form
  const ok = await run(state, async () => {
    await $fetch(`/api/admin/events/${seriesId}/${eventId}`, {
      method: 'DELETE',
    })
  })
  if (ok) info(state, 'DB からイベントを消しました (R2 の動画は残っています)')
  return ok
}

/** 画面から使う操作。名前が一般的なので、自動 import に 1 つずつ出さずまとめる */
export const adminEditor = {
  idsValid,
  addFiles,
  removeRow,
  moveRow,
  sortRows,
  refreshRemote,
  rowState,
  uploadAll,
  cancelUpload,
  register,
  loadEvent,
  reset,
  deleteEvent,
}

export function useAdminEventEditor(onUnauthorized: () => void) {
  const state = reactive<EditorState>({
    form: emptyForm(),
    entriesText: '',
    rows: [],
    remote: null,
    messages: null,
    busy: false,
    uploadAbort: null,
    onUnauthorized,
  }) as EditorState
  const entries = computed(() => parseEntriesText(state.entriesText))
  const targets = computed(() => uploadTargets(state))
  /** 行ごとの状態 (行の id → 状態)。表の 1 行で何度も使うので、1 度だけ出す */
  const rowStates = computed(
    () => new Map(state.rows.map((r) => [r.id, rowState(r, state.remote)])),
  )
  return { state, entries, targets, rowStates }
}
