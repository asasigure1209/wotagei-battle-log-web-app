// 動画の出演者の選び方 (出演者 1・2 の選択肢と、選んだものの誤り)。
// 出演者は、選んだイベントに登録済みのエントリーから選ぶ (この画面ではエントリーを書き換えない)
import type { Manifest } from '~~/server/db/manifest'
import { MAX_PERFORMERS } from '~~/shared/utils/performers'

/** 動画の出演者。出演者 1 (必須) と出演者 2 (任意)。選んでいなければ null */
export type Performers = [number | null, number | null]

/** 出演者の選択肢の 1 つ */
export type PerformerOption = { value: number; label: string }

/** 出演者 1 を選んでいないときの誤り */
export const NO_FIRST_PERFORMER = '出演者 1 を選んでください'

/** 出演者の No. の並び (DB の形) を、出演者 1・2 にする。MAX_PERFORMERS 人目より後ろは入らない */
export function toPerformers(nos: number[]): Performers {
  const [first = null, second = null] = nos.slice(0, MAX_PERFORMERS)
  return [first, second]
}

/** No. が登録済みのエントリーにあるか (選んでいない null は false) */
export function isRegistered(entries: Manifest['entries'], no: number | null) {
  return entries.some((e) => e.entryNo === no)
}

/** 選んだ出演者の No. を、出演者 1・2 の順に並べる (DB の形) */
export function performerNos(performers: Performers): number[] {
  return performers.filter((no) => no !== null)
}

/**
 * 出演者を選ぶ欄の選択肢。登録済みのエントリーを No. の順に「No. 名前」で並べる。
 * 選んでいる No. (selected) が登録済みのエントリーにない (古いデータ) ときは、そのことが分かる選択肢を先頭に足す
 */
export function performerOptions(
  entries: Manifest['entries'],
  selected: number | null,
): PerformerOption[] {
  const options = [...entries]
    .sort((a, b) => a.entryNo - b.entryNo)
    .map((e) => ({ value: e.entryNo, label: `No. ${e.entryNo} ${e.name}` }))
  if (selected === null || isRegistered(entries, selected)) {
    return options
  }
  return [
    { value: selected, label: `No. ${selected} (登録されていない)` },
    ...options,
  ]
}

/** 選んだ出演者の誤り (出演者 1 を選んでいない・同じ人を 2 回・登録済みのエントリーにない No.)。なければ空 */
export function performerProblems(
  [first, second]: Performers,
  entryNos: readonly number[],
): string[] {
  const problems: string[] = []
  if (first === null) problems.push(NO_FIRST_PERFORMER)
  if (first !== null && first === second) {
    problems.push('出演者 1 と出演者 2 に同じ人を選んでいます')
  }
  const unregistered = performerNos([first, second]).filter(
    (no) => !entryNos.includes(no),
  )
  for (const no of new Set(unregistered)) {
    problems.push(`出演者の No. ${no} は登録されていません`)
  }
  return problems
}

/** 登録すると外れる出演者 (読み込んだときに MAX_PERFORMERS 人目より後ろにいた No.) の警告。いなければ空 */
export function droppedPerformersWarning(dropped: readonly number[]) {
  if (!dropped.length) return ''
  return `出演者は ${MAX_PERFORMERS} 人までなので、登録すると No. ${dropped.join(', ')} が外れます`
}
