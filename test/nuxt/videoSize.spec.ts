import { describe, expect, it } from 'vitest'
import { formatSize, sumMb } from '~/utils/videoSize'

describe('sumMb', () => {
  it('容量 (MB) を合計する。空なら 0', () => {
    expect(sumMb([{ mb: 498 }, { mb: 1100 }])).toBe(1598)
    expect(sumMb([])).toBe(0)
  })
})

describe('formatSize', () => {
  it('1000 MB 未満は MB で出す', () => {
    expect(formatSize(0)).toBe('0 MB')
    expect(formatSize(999)).toBe('999 MB')
  })

  it('1000 MB 以上は小数第 1 位までの GB で出す', () => {
    expect(formatSize(1000)).toBe('1.0 GB')
    expect(formatSize(1598)).toBe('1.6 GB')
  })
})
