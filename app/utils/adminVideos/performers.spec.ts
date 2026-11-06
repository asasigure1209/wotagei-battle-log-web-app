import { describe, expect, it } from 'vitest'
import {
  droppedPerformersWarning,
  isRegistered,
  isSamePerformerTwice,
  NO_FIRST_PERFORMER,
  performerNos,
  performerOptions,
  performerProblems,
  toPerformers,
} from '~/utils/adminVideos/performers'

const entries = [
  { entryNo: 2, name: 'しぐれ' },
  { entryNo: 1, name: 'BLAZE' },
]

describe('出演者の 2 人分の選択', () => {
  it('toPerformers は、出演者の No. の並びを、出演者 1・2 にする (いなければ null)', () => {
    expect(toPerformers([])).toEqual([null, null])
    expect(toPerformers([3])).toEqual([3, null])
    expect(toPerformers([1, 2])).toEqual([1, 2])
  })

  it('performerNos は、選んだ No. だけを出演者 1・2 の順に並べる', () => {
    expect(performerNos([1, null])).toEqual([1])
    expect(performerNos([1, 2])).toEqual([1, 2])
    expect(performerNos([null, null])).toEqual([])
  })
})

describe('performerOptions', () => {
  it('登録済みのエントリーを No. の順に「No. 名前」で並べる', () => {
    expect(performerOptions(entries, null)).toEqual([
      { value: 1, label: 'No. 1 BLAZE' },
      { value: 2, label: 'No. 2 しぐれ' },
    ])
  })

  it('選んでいる No. が登録済みのエントリーになければ、そのことが分かる選択肢を先頭に足す', () => {
    expect(performerOptions(entries, 9)).toEqual([
      { value: 9, label: 'No. 9 (登録されていない)' },
      { value: 1, label: 'No. 1 BLAZE' },
      { value: 2, label: 'No. 2 しぐれ' },
    ])
    expect(performerOptions(entries, 1)).toHaveLength(2)
  })
})

describe('isRegistered', () => {
  it('No. が登録済みのエントリーにあるときだけ true (選んでいない null は false)', () => {
    expect(isRegistered(entries, 1)).toBe(true)
    expect(isRegistered(entries, 9)).toBe(false)
    expect(isRegistered(entries, null)).toBe(false)
  })
})

describe('isSamePerformerTwice', () => {
  it('出演者 1 と出演者 2 に同じ人を選んでいるときだけ true', () => {
    expect(isSamePerformerTwice([1, 1])).toBe(true)
    expect(isSamePerformerTwice([1, 2])).toBe(false)
    expect(isSamePerformerTwice([null, null])).toBe(false)
  })
})

describe('performerProblems', () => {
  it('出演者 1 を選び、出演者 2 は「なし」か別の人なら、誤りはない', () => {
    expect(performerProblems([1, null], entries)).toEqual([])
    expect(performerProblems([1, 2], entries)).toEqual([])
  })

  it('出演者 1 を選んでいなければ誤り', () => {
    expect(performerProblems([null, null], entries)).toEqual([
      NO_FIRST_PERFORMER,
    ])
    expect(performerProblems([null, 2], entries)).toEqual([NO_FIRST_PERFORMER])
  })

  it('同じ人を 2 回選んでいれば誤り', () => {
    expect(performerProblems([1, 1], entries)).toEqual([
      '出演者 1 と出演者 2 に同じ人を選んでいます',
    ])
  })

  it('登録済みのエントリーにない No. があれば、No. ごとに誤り', () => {
    expect(performerProblems([9, 8], entries)).toEqual([
      '出演者の No. 9 は登録されていません',
      '出演者の No. 8 は登録されていません',
    ])
  })
})

describe('droppedPerformersWarning', () => {
  it('外れる出演者があれば、その No. を挙げた警告にする (なければ空)', () => {
    expect(droppedPerformersWarning([])).toBe('')
    expect(droppedPerformersWarning([3, 4])).toBe(
      '出演者は 2 人までなので、登録すると No. 3, 4 が外れます',
    )
  })
})
