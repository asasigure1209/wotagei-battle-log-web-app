// 動画の出演者の選び方 (出演者 1・2 の選択肢と、選んだものの誤り)。
// 出演者は、選んだイベントに登録済みのエントリーから選ぶ (この画面ではエントリーを書き換えない)
import type { Manifest } from '~~/server/db/manifest'

/** 動画の出演者。出演者 1 (必須) と出演者 2 (任意)。選んでいなければ null */
export type Performers = [number | null, number | null]

/** 出演者の選択肢の 1 つ */
export type PerformerOption = { value: number; label: string }

/** 1 本の動画に選べる出演者の数 (バトルの動画には 2 人が出る。サーバーの上限と同じ) */
export const MAX_PERFORMERS = 2

/** 出演者 1 を選んでいないときの誤り */
export const NO_FIRST_PERFORMER = '出演者 1 を選んでください'

/** 出演者の No. の並び (DB の形) を、出演者 1・2 にする。3 人目からは入らない */
export function toPerformers(nos: number[]): Performers {
  const [first = null, second = null] = nos
  return [first, second]
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
  if (selected === null || options.some((o) => o.value === selected)) {
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
