// 書いた内容を manifest の形にして DB に登録し、登録済みのイベントを読み込み・消す

import {
  formatEntriesText,
  parseEntriesText,
  parsePerformers,
} from '~/utils/adminManifest'
import type { Manifest } from '~~/server/db/manifest'
import {
  type EditorState,
  emptyForm,
  eventKey,
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

/** 送る内容 (manifest の YAML を読んだ値と同じ形) と、送る前に見つかった誤り */
export function buildManifest(state: EditorState) {
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

/** DB に登録する (dryRun なら確かめるだけ)。登録できたら、このイベントを読み込んだものとして扱う */
export async function register(state: EditorState, dryRun: boolean) {
  const { manifest, problems } = buildManifest(state)
  if (problems.length) {
    showErrors(state, problems)
    return false
  }
  const ok = await run(state, async () => {
    await $fetch('/api/admin/events', {
      method: 'POST',
      body: manifest,
      query: dryRun ? { dryRun: 1 } : {},
    })
  })
  if (!ok) return false
  info(state, dryRun ? DRY_RUN_OK : REGISTERED)
  if (!dryRun) state.loadedKey = eventKey(state.form)
  return true
}

/** 登録済みのイベントと、その R2 の動画を読み込む */
export async function loadEvent(state: EditorState, key: string) {
  const [series = '', event = ''] = key.split('/')
  state.messages = null
  state.remote = null
  await run(state, async () => {
    // 2 つは別々に引けるので、待ち合わせずに並べて引く
    const [data, remote] = await Promise.all([
      $fetch<Manifest>(`/api/admin/events/${series}/${event}`),
      fetchRemote(series, event),
    ])
    fill(state, data)
    state.remote = remote
    state.loadedKey = key
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
  const prefix = eventPrefix(state)
  state.rows = data.videos.map((v) =>
    newRow(v.key.slice(prefix.length), {
      durationSec: v.durationSec,
      sizeBytes: v.sizeBytes,
      performersText: v.performers.join(', '),
    }),
  )
}

/** 新しいイベントを書き始める */
export function reset(state: EditorState) {
  state.form = emptyForm()
  state.entriesText = ''
  state.rows = []
  state.remote = null
  state.loadedKey = null
  state.messages = null
}

/** 読み込んだイベントを DB から消す。書いた内容は画面に残すので、そのまま登録し直せる */
export async function deleteEvent(state: EditorState) {
  const key = state.loadedKey
  if (!key) return false
  // URL を series と event に分けて書くと、Nitro が DELETE のルートの型を見つけられる
  const [series = '', event = ''] = key.split('/')
  const ok = await run(state, async () => {
    await $fetch(`/api/admin/events/${series}/${event}`, { method: 'DELETE' })
  })
  if (!ok) return false
  state.loadedKey = null
  info(state, 'DB からイベントを消しました (R2 の動画は残っています)')
  return true
}
