import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '~/utils/adminApi'
import {
  buildManifest,
  clear,
  fill,
  loadEvent,
  register,
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
afterEach(() => vi.restoreAllMocks())

describe('manifest の組み立て', () => {
  it('fill で書き写した内容から、取り込みと同じ形の manifest を作る (イベントの情報は選んだイベントのもの)', () => {
    const state = createEditorState(() => {})
    fill(state, manifest())
    expect(state.event).toEqual({
      series: manifest().series,
      event: manifest().event,
    })
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

  it('イベントを選んでいなければ、manifest を作らない', () => {
    const state = createEditorState(() => {})
    expect(buildManifest(state)).toEqual({
      manifest: null,
      problems: ['イベントを選んでください'],
    })
  })
})

describe('登録・読み込み・削除', () => {
  it('loadEvent はイベントと R2 の一覧を読み込み、選んだイベントとして覚える', async () => {
    const state = createEditorState(() => {})
    await loadEvent(state, { seriesId: 's', eventId: 'e' })
    expect(api.calls.sort()).toEqual([
      'GET /api/admin/events/s/e',
      'GET /api/admin/objects?series=s&event=e',
    ])
    expect(state.event?.event.id).toBe('e')
    expect(state.remote).toEqual(new Map([['予選/1.mp4', 10]]))
  })

  it('loadEvent に失敗したら、前に選んでいたイベントを外したままにする (選んだものと中身をずらさない)', async () => {
    const state = createEditorState(() => {})
    fill(state, manifest())
    vi.spyOn(adminApi, 'getEvent').mockRejectedValueOnce(
      new Error('読めません'),
    )
    await loadEvent(state, { seriesId: 's', eventId: 'f' })
    expect(state.event).toBeNull()
    expect(state.rows).toEqual([])
    expect(state.messages).toEqual({ kind: 'error', lines: ['読めません'] })
  })

  it('loadEvent を続けて呼んだら、最後に選んだイベントの結果だけを使う', async () => {
    const state = createEditorState(() => {})
    let finishFirst: (m: ReturnType<typeof manifest>) => void = () => {}
    const other = manifest()
    other.event.id = 'f'
    other.videos = []
    vi.spyOn(adminApi, 'getEvent')
      .mockImplementationOnce(() => new Promise((r) => (finishFirst = r)))
      .mockResolvedValueOnce(other)
    const first = loadEvent(state, { seriesId: 's', eventId: 'e' })
    await loadEvent(state, { seriesId: 's', eventId: 'f' })
    finishFirst(manifest())
    await first
    expect(state.event?.event.id).toBe('f')
  })

  it('register は、確かめるだけなら dryRun を付けて送る', async () => {
    const state = createEditorState(() => {})
    fill(state, manifest())
    expect(await register(state, true)).toBe(true)
    expect(await register(state, false)).toBe(true)
    expect(api.calls).toEqual([
      'POST /api/admin/events?dryRun=1',
      'POST /api/admin/events',
    ])
  })

  it('register は、イベントを選んでいなければ送らずにエラーを出す', async () => {
    const state = createEditorState(() => {})
    expect(await register(state, false)).toBe(false)
    expect(api.calls).toEqual([])
    expect(state.messages).toEqual({
      kind: 'error',
      lines: ['イベントを選んでください'],
    })
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

  it('clear は、選んだイベントを外し、書いた内容を空に戻す', () => {
    const state = createEditorState(() => {})
    fill(state, manifest())
    clear(state)
    expect(state.event).toBeNull()
    expect(state.rows).toEqual([])
    expect(state.entriesText).toBe('')
  })
})
