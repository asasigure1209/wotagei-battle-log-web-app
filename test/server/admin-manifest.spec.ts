import { describe, expect, it } from 'vitest'
import { ManifestError, parseEventInfo } from '../../server/db/manifest'
import {
  dbErrorMessage,
  invalidManifest,
  parseOrBadRequest,
} from '../../server/utils/admin-manifest'

describe('管理画面の登録の API の誤りの返し方', () => {
  it('invalidManifest は、誤りの一覧を 400 にし、画面が 1 行ずつ出せるよう data.problems にも入れる', () => {
    const error = invalidManifest(['a', 'b'])
    expect(error.statusCode).toBe(400)
    expect(error.message).toBe('a\nb')
    expect(error.data).toEqual({ problems: ['a', 'b'] })
  })

  it('parseOrBadRequest は、読めればその値を返す', () => {
    const info = {
      series: { id: 's', name: 'シリーズ' },
      event: { id: 'e', name: 'イベント', date: '2026-01-01', contact: 'x' },
    }
    expect(parseOrBadRequest(() => parseEventInfo(info))).toEqual(info)
  })

  it('parseOrBadRequest は、ManifestError を 400 にし、誤りの一覧を引き継ぐ', () => {
    expect(() =>
      parseOrBadRequest(() => {
        throw new ManifestError(['a', 'b'])
      }),
    ).toThrow(
      expect.objectContaining({
        statusCode: 400,
        data: { problems: ['a', 'b'] },
      }),
    )
  })

  it('parseOrBadRequest は、ほかのエラーはそのまま投げる (500 になる)', () => {
    const other = new TypeError('壊れた')
    expect(() =>
      parseOrBadRequest(() => {
        throw other
      }),
    ).toThrow(other)
  })

  it('dbErrorMessage は、元のエラー (cause) があればその文を、なければエラーの文を返す', () => {
    const wrapped = new Error('Failed query: insert ...', {
      cause: new Error('UNIQUE constraint failed: videos.storage_key'),
    })
    expect(dbErrorMessage(wrapped)).toBe(
      'UNIQUE constraint failed: videos.storage_key',
    )
    expect(dbErrorMessage(new Error('接続できません'))).toBe('接続できません')
    expect(dbErrorMessage('文字列')).toBe('文字列')
  })
})
