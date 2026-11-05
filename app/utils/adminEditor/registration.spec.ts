import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildManifest,
  fill,
  loadEvent,
  register,
  reset,
} from '~/utils/adminEditor/registration'
import { createEditorState } from '~/utils/adminEditor/state'
import { fakeAdminApi } from '~~/test/nuxt/adminTestUtils'

const manifest = () => ({
  series: { id: 's', name: 'シリーズ' },
  event: { id: 'e', name: 'イベント', date: '2026-01-01', contact: '連絡先' },
  entries: [
    { entryNo: 1, name: 'A' },
    { entryNo: 2, name: 'B' },
  ],
  videos: [
    { key: 's/e/予選/1.mp4', durationSec: 61, sizeBytes: 10, performers: [1] },
    {
      key: 's/e/本戦/2.mp4',
      durationSec: 192,
      sizeBytes: 20,
      performers: [1, 2],
    },
  ],
})

const api = fakeAdminApi([
  { method: 'GET', path: '/api/admin/events/s/e', body: manifest() },
  {
    method: 'GET',
    path: '/api/admin/objects',
    body: [{ key: 's/e/予選/1.mp4', size: 10 }],
  },
  { method: 'POST', path: '/api/admin/events', body: { ok: true } },
])

beforeEach(() => api.reset())

describe('manifest の組み立て', () => {
  it('fill で書き写した内容から、取り込みと同じ形の manifest を作る', () => {
    const state = createEditorState(() => {})
    fill(state, manifest())
    expect(state.entriesText).toBe('1: A\n2: B')
    expect(state.rows.map((r) => r.relPath)).toEqual([
      '予選/1.mp4',
      '本戦/2.mp4',
    ])
    const { manifest: built, problems } = buildManifest(state)
    expect(problems).toEqual([])
    expect(built).toEqual({ ...manifest(), entries: { '1': 'A', '2': 'B' } })
  })

  it('出演者・長さの書き方の誤りを集める', () => {
    const state = createEditorState(() => {})
    fill(state, manifest())
    const [first, second] = state.rows
    if (first) first.performersText = '1, x'
    if (second) second.durationSec = null
    expect(buildManifest(state).problems).toEqual([
      '出演は No. をカンマで区切って書いてください: 予選/1.mp4',
      '長さ (秒) を書いてください: 本戦/2.mp4',
    ])
  })
})

describe('登録・読み込み・削除', () => {
  it('loadEvent はイベントと R2 の一覧を読み込み、読み込んだイベントとして覚える', async () => {
    const state = createEditorState(() => {})
    await loadEvent(state, { seriesId: 's', eventId: 'e' })
    expect(api.calls.sort()).toEqual([
      'GET /api/admin/events/s/e',
      'GET /api/admin/objects?series=s&event=e',
    ])
    expect(state.loaded).toBe(true)
    expect(state.remote).toEqual(new Map([['予選/1.mp4', 10]]))
  })

  it('register は確かめるだけなら読み込んだことにせず、登録したら読み込んだことにする', async () => {
    const state = createEditorState(() => {})
    fill(state, manifest())
    expect(await register(state, true)).toBe(true)
    expect(state.loaded).toBe(false)
    expect(await register(state, false)).toBe(true)
    expect(state.loaded).toBe(true)
  })

  it('ログインが切れていたら onUnauthorized を呼び、エラーを出す', async () => {
    api.unauthorized = true
    const onUnauthorized = vi.fn()
    const state = createEditorState(onUnauthorized)
    fill(state, manifest())
    expect(await register(state, false)).toBe(false)
    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(state.messages?.kind).toBe('error')
    expect(state.busy).toBe(false)
  })

  it('reset で空に戻す', () => {
    const state = createEditorState(() => {})
    fill(state, manifest())
    state.loaded = true
    reset(state)
    expect(state.rows).toEqual([])
    expect(state.form.seriesId).toBe('')
  })
})
