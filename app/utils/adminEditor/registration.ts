// 登録済みのイベントを読み込み、書いたエントリー・動画を manifest の形にして DB に登録する

import { adminApi, type EventIds } from '~/utils/adminApi'
import {
  formatEntriesText,
  parseEntriesText,
  parsePerformers,
} from '~/utils/adminManifest'
import type { Manifest } from '~~/server/db/manifest'
import {
  type EditorState,
  emptyForm,
  eventPrefix,
  info,
  newRow,
  run,
  showErrors,
  type VideoRow,
} from './state'
import { fetchRemote } from './upload'

const DRY_RUN_OK = '問題ありません。このまま登録できます'
const REGISTERED =
  '登録しました。公開ページは最大 1 時間とっておかれるので、すぐに出したいときは Vercel で本番を再デプロイしてください'

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

/** 送る内容 (manifest の entries と videos を YAML で読んだ値と同じ形) と、送る前に見つかった誤り */
export function buildContents(state: EditorState) {
  const { entries, problems } = parseEntriesText(state.entriesText)
  const prefix = eventPrefix(state.form)
  const videos = state.rows.map((row) => manifestVideo(row, prefix, problems))
  return { contents: { entries, videos }, problems }
}

/** 選んだイベントに、エントリー・動画を DB に登録する (dryRun なら確かめるだけ) */
export async function register(state: EditorState, dryRun: boolean) {
  if (!state.loaded) return false
  const { contents, problems } = buildContents(state)
  if (problems.length) {
    showErrors(state, problems)
    return false
  }
  const ids = { ...state.form }
  const ok = await run(state, async () => {
    await adminApi.saveContents(ids, contents, dryRun)
  })
  if (!ok) return false
  info(state, dryRun ? DRY_RUN_OK : REGISTERED)
  return true
}

/** 登録済みのイベントと、その R2 の動画を読み込む */
export async function loadEvent(state: EditorState, ids: EventIds) {
  state.messages = null
  state.remote = null
  await run(state, async () => {
    // 2 つは別々に引けるので、待ち合わせずに並べて引く
    const [data, remote] = await Promise.all([
      adminApi.getEvent(ids),
      fetchRemote(ids),
    ])
    fill(state, data)
    state.remote = remote
    state.loaded = true
  })
}

/** 登録済みのイベントを、画面に書き写す */
export function fill(state: EditorState, data: Manifest) {
  state.form = {
    seriesId: data.series.id,
    seriesName: data.series.name,
    eventId: data.event.id,
    eventName: data.event.name,
    date: data.event.date,
    contact: data.event.contact,
  }
  state.entriesText = formatEntriesText(data.entries)
  const prefix = eventPrefix(state.form)
  state.rows = data.videos.map((v) =>
    newRow(v.key.slice(prefix.length), {
      durationSec: v.durationSec,
      sizeBytes: v.sizeBytes,
      performersText: v.performers.join(', '),
    }),
  )
}

/** イベントを選んでいない状態に戻す */
export function reset(state: EditorState) {
  state.form = emptyForm()
  state.entriesText = ''
  state.rows = []
  state.remote = null
  state.loaded = false
  state.messages = null
}
