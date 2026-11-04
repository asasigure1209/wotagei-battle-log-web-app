import { describe, expect, it } from 'vitest'
import {
  invalidManifest,
  parseEventInfoBody,
  parseManifestBody,
} from './admin-event'

const body = () => ({
  seriesName: 'シリーズ',
  name: 'イベント',
  date: '2026-01-01',
  contact: '連絡先',
})

/** fn が投げた値 */
function thrown(fn: () => unknown) {
  try {
    fn()
  } catch (e) {
    return e
  }
}

describe('管理画面のイベントの登録のリクエスト', () => {
  it('invalidManifest は、誤りの一覧を data.problems に持つ 400', () => {
    expect(invalidManifest(['a', 'b'])).toEqual(
      expect.objectContaining({
        statusCode: 400,
        message: 'a\nb',
        data: { problems: ['a', 'b'] },
      }),
    )
  })

  it('parseManifestBody は、manifest の誤りを 400 にする', () => {
    expect(thrown(() => parseManifestBody({}))).toEqual(
      expect.objectContaining({ statusCode: 400 }),
    )
  })

  it('parseEventInfoBody は、パスの ID と本文から、シリーズとイベントの情報を作る', () => {
    expect(parseEventInfoBody('s', 'e', body())).toEqual({
      series: { id: 's', name: 'シリーズ' },
      event: {
        id: 'e',
        name: 'イベント',
        date: '2026-01-01',
        contact: '連絡先',
      },
    })
  })

  it('parseEventInfoBody は、誤りがあれば manifest の登録と同じ形の 400 にする', () => {
    expect(
      thrown(() => parseEventInfoBody('s', 'e', { ...body(), name: '' })),
    ).toEqual(
      expect.objectContaining({
        statusCode: 400,
        data: { problems: ['event.name を書いてください'] },
      }),
    )
  })
})
