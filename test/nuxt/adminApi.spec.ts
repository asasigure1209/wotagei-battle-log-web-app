import { describe, expect, it } from 'vitest'
import { adminApi, adminErrorMessages, isUnauthorized } from '~/utils/adminApi'
import { fakeAdminApi } from './adminTestUtils'

describe('API のエラーの読み取り', () => {
  it('誤りの一覧 (data.problems) があれば 1 行ずつ返す', () => {
    const error = { data: { data: { problems: ['a', 'b'] }, message: 'x' } }
    expect(adminErrorMessages(error)).toEqual(['a', 'b'])
  })

  it('なければ、サーバーの文、エラーの文の順に使う', () => {
    expect(adminErrorMessages({ data: { message: 'サーバー' } })).toEqual([
      'サーバー',
    ])
    expect(adminErrorMessages(new Error('ネットワーク'))).toEqual([
      'ネットワーク',
    ])
    expect(adminErrorMessages('文字列')).toEqual(['文字列'])
  })

  it('isUnauthorized は 401 のときだけ true', () => {
    expect(isUnauthorized({ statusCode: 401 })).toBe(true)
    expect(isUnauthorized({ statusCode: 403 })).toBe(false)
    expect(isUnauthorized(null)).toBe(false)
  })
})

const api = fakeAdminApi([
  { method: 'GET', path: '/api/admin/events', body: [] },
  { method: 'POST', path: '/api/admin/events', body: { ok: true } },
  { method: 'GET', path: '/api/admin/events/s/e', body: {} },
  { method: 'DELETE', path: '/api/admin/events/s/e', body: { ok: true } },
  { method: 'GET', path: '/api/admin/objects', body: [] },
])

describe('adminApi', () => {
  it('イベントの ID の組から、それぞれの URL とクエリを組み立てる', async () => {
    const ids = { seriesId: 's', eventId: 'e' }
    await adminApi.listEvents()
    await adminApi.getEvent(ids)
    await adminApi.deleteEvent(ids)
    await adminApi.listObjects(ids)
    await adminApi.saveEvent({}, true)
    await adminApi.saveEvent({}, false)
    expect(api.calls).toEqual([
      'GET /api/admin/events',
      'GET /api/admin/events/s/e',
      'DELETE /api/admin/events/s/e',
      'GET /api/admin/objects?series=s&event=e',
      'POST /api/admin/events?dryRun=1',
      'POST /api/admin/events',
    ])
  })
})
