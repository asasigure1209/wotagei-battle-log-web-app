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
import { formatEntryNames, parseEntryNames } from '~/utils/adminManifest'
import type { Manifest } from '~~/server/db/manifest'
import type { EntriesFormState } from './state'

const NOT_SELECTED = 'イベントを選んでください'
const NO_NAMES = 'エントリーの名前を 1 行に 1 人ずつ書いてください'

/**
 * 選んだ登録済みのイベントを読み込み、登録済みのエントリーの名前を画面に書き写す。
 * 選ぶ・選び直す・外す処理は adminCommon/eventSelection がこれを使って行う
 */
export const entriesLoader: EventLoader<EntriesFormState, Manifest> = {
  fetch: (ids) => adminApi.getEvent(ids),
  toEvent: (data) => ({ series: data.series, event: data.event }),
  fill: (state, data) => {
    state.namesText = formatEntryNames(data.entries)
  },
  reset: (state) => {
    state.namesText = ''
    state.registered = false
  },
}

/** 送る前に確かめる。送れるなら、送るイベントと名前を返す (送れなければ画面に誤りを出して null) */
function saveTarget(state: EntriesFormState) {
  const ids = selectedIds(state)
  const names = parseEntryNames(state.namesText)
  if (ids && names.length) return { ids, names }
  showErrors(state, [ids ? NO_NAMES : NOT_SELECTED])
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
  const ok = await run(state, async () => {
    await adminApi.saveEntries(ids, names, dryRun)
  })
  if (!ok) return false
  if (dryRun) {
    info(state, DRY_RUN_OK)
    return true
  }
  // 送った名前に書き直し、画面を登録したものと同じにする
  state.namesText = names.join('\n')
  state.registered = true
  info(state, REGISTERED)
  return true
}
