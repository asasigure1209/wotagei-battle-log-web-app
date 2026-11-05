// 選んだイベントを読み込み、書いたエントリーと動画を manifest の形にして DB に登録する

import { adminApi, type EventIds } from '~/utils/adminApi'
import { eventPrefix } from '~/utils/adminCommon/eventKey'
import { info, run, showErrors } from '~/utils/adminCommon/operation'
import {
  formatEntriesText,
  parseEntriesText,
  parsePerformers,
} from '~/utils/adminManifest'
import type { Manifest } from '~~/server/db/manifest'
import { type EditorState, newRow, selectedIds, type VideoRow } from './state'
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

/** 送る内容 (manifest の YAML を読んだ値と同じ形) と、送る前に見つかった誤り */
export function buildManifest(state: EditorState) {
  const ids = selectedIds(state)
  if (!state.event || !ids) {
    return { manifest: null, problems: ['イベントを選んでください'] }
  }
  const { entries, problems } = parseEntriesText(state.entriesText)
  const prefix = eventPrefix(ids)
  const videos = state.rows.map((row) => manifestVideo(row, prefix, problems))
  const manifest = { ...state.event, entries, videos }
  return { manifest, problems }
}

/** DB に登録する (dryRun なら確かめるだけ) */
export async function register(state: EditorState, dryRun: boolean) {
  const { manifest, problems } = buildManifest(state)
  if (!manifest || problems.length) {
    showErrors(state, problems)
    return false
  }
  const ok = await run(state, async () => {
    await adminApi.saveEvent(manifest, dryRun)
  })
  if (ok) info(state, dryRun ? DRY_RUN_OK : REGISTERED)
  return ok
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
  })
}

/** 登録済みのイベントを、画面に書き写す */
export function fill(state: EditorState, data: Manifest) {
  state.event = { series: data.series, event: data.event }
  state.entriesText = formatEntriesText(data.entries)
  const prefix = eventPrefix({
    seriesId: data.series.id,
    eventId: data.event.id,
  })
  state.rows = data.videos.map((v) =>
    newRow(v.key.slice(prefix.length), {
      durationSec: v.durationSec,
      sizeBytes: v.sizeBytes,
      performersText: v.performers.join(', '),
    }),
  )
}

/** 選んだイベントを外し、書いた内容を空に戻す */
export function clear(state: EditorState) {
  state.event = null
  state.entriesText = ''
  state.rows = []
  state.remote = null
  state.messages = null
}
