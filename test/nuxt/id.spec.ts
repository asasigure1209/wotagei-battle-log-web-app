import { describe, expect, it } from 'vitest'
import { isId } from '~~/shared/utils/id'

describe('シリーズ ID・イベント ID の確認', () => {
  it('英数字と _ - だけの文字列を通す', () => {
    expect(isId('elnino_vol_5')).toBe(true)
    expect(isId('a-b')).toBe(true)
    expect(isId('A1')).toBe(true)
  })

  it('空文字や、空白・/・.・%・日本語を含む文字列は通さない', () => {
    expect(isId('')).toBe(false)
    expect(isId('a b')).toBe(false)
    expect(isId('a/b')).toBe(false)
    expect(isId('a.b')).toBe(false)
    expect(isId('a%20b')).toBe(false)
    expect(isId('エルニーニョ')).toBe(false)
  })

  it('文字列でなければ通さない', () => {
    expect(isId(1)).toBe(false)
    expect(isId(undefined)).toBe(false)
    expect(isId(null)).toBe(false)
    expect(isId({ id: 'a' })).toBe(false)
  })
})
