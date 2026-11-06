import { describe, expect, it } from 'vitest'
import {
  invalidManifest,
  invalidOnDbError,
  parseEntryNamesBody,
  parseEventInfoBody,
  parseManifestBody,
  removedPerformerProblems,
  unregisteredEvent,
} from './admin-event'

const body = () => ({
  seriesName: 'シリーズ',
  name: 'イベント',
  date: '2026-01-01',
  contact: '連絡先',
})

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
    expect(() => parseManifestBody({})).toThrow(
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
    expect(() => parseEventInfoBody('s', 'e', { ...body(), name: '' })).toThrow(
      expect.objectContaining({
        statusCode: 400,
        data: { problems: ['event.name を書いてください'] },
      }),
    )
  })
  it('unregisteredEvent は、先にイベントを登録するよう案内する 400', () => {
    expect(unregisteredEvent('s', 'e')).toEqual(
      expect.objectContaining({
        statusCode: 400,
        data: {
          problems: [
            '登録されていないイベントです (s/e)。先にイベントの登録の画面で登録してください',
          ],
        },
      }),
    )
  })
})

describe('エントリーだけの登録のリクエスト', () => {
  it('parseEntryNamesBody は、書いた順に 1 からエントリー No. を振り、前後の空白を除く', () => {
    expect(parseEntryNamesBody({ names: [' A ', 'B'] })).toEqual([
      { entryNo: 1, name: 'A' },
      { entryNo: 2, name: 'B' },
    ])
  })

  it('parseEntryNamesBody は、空の名前をまとめて 400 にする', () => {
    expect(() => parseEntryNamesBody({ names: ['A', ' ', 'C', ''] })).toThrow(
      expect.objectContaining({
        statusCode: 400,
        data: {
          problems: [
            '2 行目の名前を書いてください',
            '4 行目の名前を書いてください',
          ],
        },
      }),
    )
  })

  it('parseEntryNamesBody は、1 人もいない・names が名前の配列でないときも 400', () => {
    expect(() => parseEntryNamesBody({ names: [] })).toThrow(
      expect.objectContaining({
        statusCode: 400,
        data: { problems: ['エントリーを 1 人以上書いてください'] },
      }),
    )
    for (const body of [{}, null, { names: 'A' }]) {
      expect(() => parseEntryNamesBody(body)).toThrow(
        expect.objectContaining({
          statusCode: 400,
          data: { problems: ['names は名前の配列で書いてください'] },
        }),
      )
    }
    expect(() => parseEntryNamesBody({ names: ['A', 1] })).toThrow(
      expect.objectContaining({
        data: { problems: ['2 行目の名前を書いてください'] },
      }),
    )
  })

  const performed = [
    { entryNo: 1, name: 'A', key: 's/e/1.mp4' },
    { entryNo: 3, name: 'C', key: 's/e/1.mp4' },
    { entryNo: 3, name: 'C', key: 's/e/2.mp4' },
  ]

  it('removedPerformerProblems は、新しい一覧にない No. が動画に出ていれば、その動画のキーを添えて返す', () => {
    expect(
      removedPerformerProblems([{ entryNo: 1, name: 'A' }], performed),
    ).toEqual([
      'エントリー No. 3 (C) は動画に出ているので消せません: s/e/1.mp4, s/e/2.mp4',
    ])
  })

  it('removedPerformerProblems は、名前を変えただけ (同じ No.) なら誤りにしない', () => {
    const renamed = [1, 2, 3].map((entryNo) => ({
      entryNo,
      name: '新しい名前',
    }))
    expect(removedPerformerProblems(renamed, performed)).toEqual([])
  })
})

describe('DB の失敗', () => {
  it('invalidOnDbError は、書き込みの結果をそのまま返す', async () => {
    expect(await invalidOnDbError(async () => 1)).toBe(1)
  })

  it('invalidOnDbError は、DB に弾かれたら (原因の文があればそれを添えて) 400 にする', async () => {
    const error = new Error('Failed query', {
      cause: new Error('FOREIGN KEY constraint failed'),
    })
    await expect(invalidOnDbError(() => Promise.reject(error))).rejects.toEqual(
      expect.objectContaining({
        statusCode: 400,
        data: {
          problems: [
            'DB に登録できませんでした: FOREIGN KEY constraint failed',
          ],
        },
      }),
    )
    await expect(
      invalidOnDbError(() => Promise.reject(new Error('失敗'))),
    ).rejects.toEqual(
      expect.objectContaining({
        data: { problems: ['DB に登録できませんでした: 失敗'] },
      }),
    )
  })
})
