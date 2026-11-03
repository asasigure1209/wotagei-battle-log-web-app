import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { getQuery, type H3Event } from 'h3'
import { describe, expect, it } from 'vitest'
import { adminApi, adminErrorMessages, isUnauthorized } from '~/utils/adminApi'

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

/** 偽の API が受けたリクエスト */
const received: string[] = []
const record =
  (label: string, body: unknown = { ok: true }) =>
  (event: H3Event) => {
    received.push(`${label} ${JSON.stringify(getQuery(event))}`)
    return body
  }

registerEndpoint('/api/admin/events', {
  method: 'GET',
  handler: record('list', []),
})
registerEndpoint('/api/admin/events', {
  method: 'POST',
  handler: record('save'),
})
registerEndpoint('/api/admin/events/s/e', {
  method: 'GET',
  handler: record('get', {}),
})
registerEndpoint('/api/admin/events/s/e', {
  method: 'DELETE',
  handler: record('delete'),
})
registerEndpoint('/api/admin/objects', {
  method: 'GET',
  handler: record('objects', []),
})

describe('adminApi', () => {
  const ids = { seriesId: 's', eventId: 'e' }

  it('イベントの ID の組から、それぞれの URL とクエリを組み立てる', async () => {
    received.length = 0
    await adminApi.listEvents()
    await adminApi.getEvent(ids)
    await adminApi.deleteEvent(ids)
    await adminApi.listObjects(ids)
    await adminApi.saveEvent({}, true)
    await adminApi.saveEvent({}, false)
    expect(received).toEqual([
      'list {}',
      'get {}',
      'delete {}',
      'objects {"series":"s","event":"e"}',
      'save {"dryRun":"1"}',
      'save {}',
    ])
  })
})
