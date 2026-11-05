import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '~/utils/adminApi'
import {
  fillSeriesName,
  open,
  reloadList,
  remove,
  save,
} from '~/utils/adminEvents/actions'
import { createEventFormState } from '~/utils/adminEvents/state'
import { fakeAdminApi } from '~~/test/nuxt/adminTestUtils'

const registered = {
  seriesId: 's',
  seriesName: 'シリーズ',
  eventId: 'e',
  eventName: 'イベント',
  date: '2026-01-01',
  contact: '連絡先',
}

const api = fakeAdminApi([
  { method: 'GET', path: '/api/admin/events', body: [registered] },
  { method: 'PUT', path: '/api/admin/events/s/e', body: { ok: true } },
  { method: 'PUT', path: '/api/admin/events/s/f', body: { ok: true } },
  { method: 'DELETE', path: '/api/admin/events/s/e', body: { ok: true } },
])

beforeEach(() => api.reset())
afterEach(() => vi.restoreAllMocks())

/** 一覧の読み直しだけを、次の 1 回失敗させる */
const failNextListReload = () =>
  vi
    .spyOn(adminApi, 'listEvents')
    .mockRejectedValueOnce(new Error('一覧を読めませんでした'))

/** 登録済みのイベントの一覧を読んだ状態 */
function stateWithList() {
  const state = createEventFormState(() => {})
  state.list = [registered]
  return state
}

/** 新しいイベント s/f を書いた状態 */
function stateWithNewEvent() {
  const state = stateWithList()
  Object.assign(state.form, {
    seriesId: 's',
    seriesName: 'シリーズ',
    eventId: 'f',
    eventName: 'イベント f',
    date: '2026-02-01',
    contact: '連絡先',
  })
  return state
}

describe('イベントを選ぶ', () => {
  it('reloadList で登録済みのイベントの一覧を読む', async () => {
    const state = createEventFormState(() => {})
    await reloadList(state)
    expect(state.list).toEqual([registered])
  })

  it('open で登録済みのイベントをフォームに書き写し、空なら新しいイベントを書き始める', () => {
    const state = stateWithList()
    open(state, 's/e')
    expect(state.selectedKey).toBe('s/e')
    expect(state.form).toEqual({
      seriesId: 's',
      seriesName: 'シリーズ',
      eventId: 'e',
      eventName: 'イベント',
      date: '2026-01-01',
      contact: '連絡先',
    })
    open(state, '')
    expect(state.selectedKey).toBe('')
    expect(state.form.eventId).toBe('')
  })

  it('fillSeriesName は、登録済みのシリーズ ID ならシリーズ名を埋める', () => {
    const state = stateWithList()
    state.form.seriesId = 's'
    fillSeriesName(state)
    expect(state.form.seriesName).toBe('シリーズ')
    state.form.seriesId = 'x'
    fillSeriesName(state)
    expect(state.form.seriesName).toBe('シリーズ')
  })
})

describe('登録・削除', () => {
  it('新しいイベントは、送る前に一覧を読み直して確かめ、送ったあとも読み直して、そのイベントを選んだことにする', async () => {
    const state = stateWithNewEvent()
    expect(await save(state)).toBe(true)
    expect(api.calls).toEqual([
      'GET /api/admin/events',
      'PUT /api/admin/events/s/f',
      'GET /api/admin/events',
    ])
    expect(state.selectedKey).toBe('s/f')
    expect(state.messages?.kind).toBe('info')
  })

  it('新しく書いたイベントの ID が登録済みなら、送らずに誤りにする (画面の一覧が古くても)', async () => {
    const state = stateWithNewEvent()
    // 画面を開いたあとに、ほかで s/e が登録された
    state.list = []
    state.form.eventId = 'e'
    expect(await save(state)).toBe(false)
    expect(api.calls).toEqual(['GET /api/admin/events'])
    expect(state.messages?.kind).toBe('error')
  })

  it('新しいイベントで、送る前の一覧の読み直しに失敗したら、送らない', async () => {
    failNextListReload()
    const state = stateWithNewEvent()
    expect(await save(state)).toBe(false)
    expect(api.calls).toEqual([])
    expect(state.messages?.kind).toBe('error')
  })

  it('送れたあとの一覧の読み直しに失敗しても、登録できたことにして、そのイベントを選ぶ', async () => {
    const state = stateWithList()
    open(state, 's/e')
    failNextListReload()
    expect(await save(state)).toBe(true)
    expect(state.selectedKey).toBe('s/e')
    expect(state.messages).toEqual({
      kind: 'error',
      lines: ['一覧を読めませんでした'],
    })
  })

  it('登録済みのイベントを選んでいれば、同じ ID で書き換える', async () => {
    const state = stateWithList()
    open(state, 's/e')
    state.form.eventName = '直した名前'
    expect(await save(state)).toBe(true)
    expect(api.calls[0]).toBe('PUT /api/admin/events/s/e')
  })

  it('remove は選んだイベントを消し、書いた内容は残して新しいイベントとして扱う', async () => {
    const state = stateWithList()
    open(state, 's/e')
    expect(await remove(state)).toBe(true)
    expect(api.calls).toEqual([
      'DELETE /api/admin/events/s/e',
      'GET /api/admin/events',
    ])
    expect(state.selectedKey).toBe('')
    expect(state.form.eventId).toBe('e')
  })

  it('消せたあとの一覧の読み直しに失敗しても、消したイベントは選ばない', async () => {
    const state = stateWithList()
    open(state, 's/e')
    failNextListReload()
    expect(await remove(state)).toBe(true)
    expect(state.selectedKey).toBe('')
    expect(state.messages?.kind).toBe('error')
  })

  it('ログインが切れていたら onUnauthorized を呼ぶ', async () => {
    api.unauthorized = true
    const onUnauthorized = vi.fn()
    const state = createEventFormState(onUnauthorized)
    Object.assign(state.form, stateWithNewEvent().form)
    expect(await save(state)).toBe(false)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
})
