import { describe, expect, it } from 'vitest'
import {
  requireEventIds,
  requirePartNumbers,
  requirePositiveInt,
  requireR2Upload,
  requireUploadId,
  requireVideoKey,
} from './admin-upload'

/** fn が 400 (Bad Request) を投げるか */
const expectBadRequest = (fn: () => unknown) =>
  expect(fn).toThrow(expect.objectContaining({ statusCode: 400 }))

describe('管理画面の API のリクエストの確かめ', () => {
  it('requireEventIds は、英数字と _ - だけの ID の組だけを通す', () => {
    expect(requireEventIds('elnino', 'vol_5')).toEqual({
      series: 'elnino',
      event: 'vol_5',
    })
    expectBadRequest(() => requireEventIds('elnino', 'vol/5'))
    expectBadRequest(() => requireEventIds(undefined, 'vol_5'))
  })

  it('requireVideoKey は、動画のキーの形だけを通す', () => {
    expect(requireVideoKey('s/e/予選/M1.mp4')).toBe('s/e/予選/M1.mp4')
    expectBadRequest(() => requireVideoKey('s/e/../M1.mp4'))
    expectBadRequest(() => requireVideoKey('s/e/M1.mov'))
    expectBadRequest(() => requireVideoKey(1))
  })

  it('requireUploadId は、空でない文字列だけを通す', () => {
    expect(requireUploadId('u1')).toBe('u1')
    expectBadRequest(() => requireUploadId(''))
    expectBadRequest(() => requireUploadId(1))
  })

  it('requirePositiveInt は、1 以上 max 以下の整数だけを通す', () => {
    expect(requirePositiveInt(1, 'n')).toBe(1)
    expect(requirePositiveInt(10000, 'n')).toBe(10000)
    expectBadRequest(() => requirePositiveInt(0, 'n'))
    expectBadRequest(() => requirePositiveInt(10001, 'n'))
    expectBadRequest(() => requirePositiveInt(1.5, 'n'))
    expectBadRequest(() => requirePositiveInt('1', 'n'))
  })

  it('requirePartNumbers は、1〜1000 個のパート番号の並びだけを通す', () => {
    expect(requirePartNumbers([1, 2, 3])).toEqual([1, 2, 3])
    expect(
      requirePartNumbers(Array.from({ length: 1000 }, (_, i) => i + 1)),
    ).toHaveLength(1000)
    expectBadRequest(() => requirePartNumbers([]))
    expectBadRequest(() =>
      requirePartNumbers(Array.from({ length: 1001 }, () => 1)),
    )
    expectBadRequest(() => requirePartNumbers([1, 0]))
    expectBadRequest(() => requirePartNumbers('1'))
  })
})

describe('requireR2Upload', () => {
  const r2 = {
    accountId: 'account',
    accessKeyId: 'read',
    secretAccessKey: 'read-secret',
    bucket: 'bucket',
    endpoint: '',
    uploadAccessKeyId: 'write',
    uploadSecretAccessKey: 'write-secret',
  }

  it('書き込み用のトークンで R2 につなぐ値を返す', () => {
    expect(requireR2Upload(r2)).toMatchObject({
      accessKeyId: 'write',
      secretAccessKey: 'write-secret',
    })
  })

  it('書き込み用のトークンがなければ 500 にする (読み出し用のトークンでは代わりにしない)', () => {
    expect(() => requireR2Upload({ ...r2, uploadAccessKeyId: '' })).toThrow(
      expect.objectContaining({ statusCode: 500 }),
    )
  })
})
