import { describe, expect, it } from 'vitest'
import {
  requireEventIds,
  requirePartNumbers,
  requirePositiveInt,
  requireUploadId,
  requireVideoKey,
} from '../../server/utils/admin-upload'

/** fn が status の HTTP エラーを投げるか */
function expectStatus(fn: () => unknown, status: number) {
  try {
    fn()
  } catch (error) {
    expect((error as { statusCode?: number }).statusCode).toBe(status)
    return
  }
  throw new Error('エラーになりませんでした')
}

describe('管理画面の API のリクエストの確かめ', () => {
  it('requireEventIds は、英数字と _ - だけの ID の組だけを通す', () => {
    expect(requireEventIds('elnino', 'vol_5')).toEqual({
      series: 'elnino',
      event: 'vol_5',
    })
    expectStatus(() => requireEventIds('elnino', 'vol/5'), 400)
    expectStatus(() => requireEventIds(undefined, 'vol_5'), 400)
  })

  it('requireVideoKey は、動画のキーの形だけを通す', () => {
    expect(requireVideoKey('s/e/予選/M1.mp4')).toBe('s/e/予選/M1.mp4')
    expectStatus(() => requireVideoKey('s/e/../M1.mp4'), 400)
    expectStatus(() => requireVideoKey('s/e/M1.mov'), 400)
    expectStatus(() => requireVideoKey(1), 400)
  })

  it('requireUploadId は、空でない文字列だけを通す', () => {
    expect(requireUploadId('u1')).toBe('u1')
    expectStatus(() => requireUploadId(''), 400)
    expectStatus(() => requireUploadId(1), 400)
  })

  it('requirePositiveInt は、1 以上 max 以下の整数だけを通す', () => {
    expect(requirePositiveInt(1, 'n')).toBe(1)
    expect(requirePositiveInt(10000, 'n')).toBe(10000)
    expectStatus(() => requirePositiveInt(0, 'n'), 400)
    expectStatus(() => requirePositiveInt(10001, 'n'), 400)
    expectStatus(() => requirePositiveInt(1.5, 'n'), 400)
    expectStatus(() => requirePositiveInt('1', 'n'), 400)
  })

  it('requirePartNumbers は、1〜1000 個のパート番号の並びだけを通す', () => {
    expect(requirePartNumbers([1, 2, 3])).toEqual([1, 2, 3])
    expect(
      requirePartNumbers(Array.from({ length: 1000 }, (_, i) => i + 1)),
    ).toHaveLength(1000)
    expectStatus(() => requirePartNumbers([]), 400)
    expectStatus(
      () => requirePartNumbers(Array.from({ length: 1001 }, () => 1)),
      400,
    )
    expectStatus(() => requirePartNumbers([1, 0]), 400)
    expectStatus(() => requirePartNumbers('1'), 400)
  })
})
