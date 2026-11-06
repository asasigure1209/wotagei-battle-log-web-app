// エントリーの登録画面の操作: 選んだイベントの登録済みのエントリーを読み込む・書いた名前をエントリーとして登録する
import { adminApi } from '~/utils/adminApi'
import {
  type EventLoader,
  selectedIds,
} from '~/utils/adminCommon/eventSelection'
import {
  DRY_RUN_OK,
  info,
  REGISTERED,
  run,
  showErrors,
} from '~/utils/adminCommon/operation'
import {
  formatEntryNames,
  isNumberedFromOne,
  parseEntryNames,
} from '~/utils/adminManifest'
import type { Manifest } from '~~/server/db/manifest'
import type { EntriesFormState } from './state'

const NOT_SELECTED = 'イベントを選んでください'
const NO_NAMES = 'エントリーの名前を 1 行に 1 人ずつ書いてください'

/** 読み込んだエントリーの No. が 1 から抜けなく並んでいなければ、その誤りの文 (並んでいれば空) */
function entryNosProblem(entries: Manifest['entries']) {
  if (isNumberedFromOne(entries)) return ''
  const nos = entries.map((e) => e.entryNo).sort((a, b) => a - b)
  return `登録済みのエントリーの No. に抜けがあります (${nos.join(', ')})。この画面で登録すると No. が振り直されて動画の出演者がずれるので、登録できません。動画の登録の画面のエントリーの欄で No. を 1 から抜けなく付け直し、出演 No. も合わせて直してから登録してください`
}

/**
 * 選んだ登録済みのイベントを読み込み、登録済みのエントリーの名前を画面に書き写す。
 * 選ぶ・選び直す・外す処理は adminCommon/eventSelection がこれを使って行う
 */
export const entriesLoader: EventLoader<EntriesFormState, Manifest> = {
  fetch: (ids) => adminApi.getEvent(ids),
  toEvent: (data) => ({ series: data.series, event: data.event }),
  fill: (state, data) => {
    state.namesText = formatEntryNames(data.entries)
    state.entryNosProblem = entryNosProblem(data.entries)
    if (state.entryNosProblem) showErrors(state, [state.entryNosProblem])
  },
  reset: (state) => {
    state.namesText = ''
    state.entryNosProblem = ''
    state.savedNamesText = null
  },
}

/** 送る前に確かめる。送れるなら、送るイベントと名前を返す (送れなければ画面に誤りを出して null) */
function saveTarget(state: EntriesFormState) {
  const ids = selectedIds(state)
  const names = parseEntryNames(state.namesText)
  const problem = !ids ? NOT_SELECTED : state.entryNosProblem
  if (ids && !problem && names.length) return { ids, names }
  showErrors(state, [problem || NO_NAMES])
  return null
}

/**
 * 書いた名前を、選んだイベントのエントリーとして登録する (No. は書いた順に 1 から)。dryRun なら確かめるだけ。
 * 動画に出ているエントリーが消えるときなどはサーバーが弾き、その誤りを画面に出す
 */
export async function save(state: EntriesFormState, dryRun: boolean) {
  const target = saveTarget(state)
  if (!target) return false
  const { ids, names } = target
  // 登録に失敗したら、前に登録できた文のままとは限らないので忘れる
  if (!dryRun) state.savedNamesText = null
  // 送っている間にイベントを選び直したら、結果を書かない
  const seq = state.loadSeq
  const ok = await run(state, async () => {
    await adminApi.saveEntries(ids, names, dryRun)
  })
  if (!ok || seq !== state.loadSeq) return false
  if (dryRun) {
    info(state, DRY_RUN_OK)
    return true
  }
  // 送った名前に書き直し、画面を登録したものと同じにする
  state.namesText = names.join('\n')
  state.savedNamesText = state.namesText
  info(state, REGISTERED)
  return true
}
