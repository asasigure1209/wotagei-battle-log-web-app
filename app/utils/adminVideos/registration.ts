// 選んだイベントの読み込み方と、動画と選んだ出演者を (エントリーは送らずに) DB に登録する処理

import { adminApi } from '~/utils/adminApi'
import { eventPrefix } from '~/utils/adminCommon/eventKey'
import {
  type EventLoader,
  eventIds,
  selectedIds,
} from '~/utils/adminCommon/eventSelection'
import {
  DRY_RUN_OK,
  info,
  REGISTERED,
  run,
  showErrors,
} from '~/utils/adminCommon/operation'
import type { Manifest } from '~~/server/db/manifest'
import { MAX_PERFORMERS } from '~~/shared/utils/performers'
import { performerNos, performerProblems, toPerformers } from './performers'
import { newRow, type VideoEditorState, type VideoRow } from './state'
import { fetchRemote } from './upload'

const NOT_SELECTED = 'イベントを選んでください'
const NO_ENTRIES =
  'このイベントにはまだエントリーがありません。先にエントリーの登録の画面で登録してください'

/** 動画の 1 行を、manifest の videos の 1 本と同じ形にする。出演者・長さの誤りは problems に足す */
function videoOf(
  row: VideoRow,
  { prefix, entryNos }: { prefix: string; entryNos: number[] },
  problems: string[],
) {
  for (const p of performerProblems(row.performers, entryNos)) {
    problems.push(`${p}: ${row.relPath}`)
  }
  if (row.durationSec === null || Number.isNaN(row.durationSec)) {
    problems.push(`長さ (秒) を書いてください: ${row.relPath}`)
  }
  return {
    key: prefix + row.relPath,
    durationSec: row.durationSec ?? 0,
    sizeBytes: row.sizeBytes,
    performers: performerNos(row.performers),
  }
}

/**
 * 送る内容 (選んだイベントの ID と、manifest の videos と同じ形の動画。エントリーは送らない) と、
 * 送る前に見つかった誤り
 */
export function buildVideos(state: VideoEditorState) {
  const ids = selectedIds(state)
  if (!ids) return { ids: null, videos: [], problems: [NOT_SELECTED] }
  if (!state.entries.length) return { ids, videos: [], problems: [NO_ENTRIES] }
  const problems: string[] = []
  const scope = {
    prefix: eventPrefix(ids),
    entryNos: state.entries.map((e) => e.entryNo),
  }
  const videos = state.rows.map((row) => videoOf(row, scope, problems))
  return { ids, videos, problems }
}

/** 選んだイベントの動画と出演者を入れ直す (dryRun なら確かめるだけ)。エントリーには触れない */
export async function register(state: VideoEditorState, dryRun: boolean) {
  const { ids, videos, problems } = buildVideos(state)
  if (!ids || problems.length) {
    showErrors(state, problems)
    return false
  }
  const ok = await run(state, async () => {
    await adminApi.saveVideos(ids, videos, dryRun)
  })
  if (ok) info(state, dryRun ? DRY_RUN_OK : REGISTERED)
  return ok
}

/**
 * 選んだ登録済みのイベントと、その R2 の動画を読み込み、画面に書き写す。
 * 選ぶ・選び直す・外す処理は adminCommon/eventSelection がこれを使って行う
 */
export const editorLoader: EventLoader<
  VideoEditorState,
  [Manifest, Map<string, number>]
> = {
  // 2 つは別々に引けるので、待ち合わせずに並べて引く
  fetch: (ids) => Promise.all([adminApi.getEvent(ids), fetchRemote(ids)]),
  toEvent: ([data]) => ({ series: data.series, event: data.event }),
  fill: (state, [data, remote]) => {
    fill(state, data)
    state.remote = remote
  },
  reset: (state) => {
    state.entries = []
    state.rows = []
    state.remote = null
  },
}

/**
 * 登録済みのイベントのエントリーと動画を、画面に書き写す (選んだイベントの情報は state.event に入れておく)。
 * 動画は、登録済みの出演者を選んだ状態にする
 */
export function fill(state: VideoEditorState, data: Manifest) {
  state.entries = data.entries
  const prefix = eventPrefix(eventIds(data))
  state.rows = data.videos.map((v) =>
    newRow(v.key.slice(prefix.length), {
      durationSec: v.durationSec,
      sizeBytes: v.sizeBytes,
      performers: toPerformers(v.performers),
    }),
  )
  // db:import では 3 人以上も登録できるが、この画面では 2 人までしか選べないので、外れることを知らせる
  const over = data.videos.filter((v) => v.performers.length > MAX_PERFORMERS)
  if (over.length) {
    showErrors(state, [
      `出演者が ${MAX_PERFORMERS + 1} 人以上の動画があります。この画面では ${MAX_PERFORMERS} 人までしか選べないので、登録すると ${MAX_PERFORMERS + 1} 人目からは外れます: ${over.map((v) => v.key).join(', ')}`,
    ])
  }
}
