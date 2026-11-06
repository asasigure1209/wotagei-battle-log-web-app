import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '~/utils/adminApi'
import { loadSelectedEvent, unselect } from '~/utils/adminCommon/eventSelection'
import {
  buildManifest,
  editorLoader,
  fill,
  register,
} from '~/utils/adminVideos/registration'
import { createVideoEditorState } from '~/utils/adminVideos/state'
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

/** manifest() のイベントを選んで読み込んだところ (loadSelectedEvent と同じく、イベントを入れてから書き写す) */
function filledState(onUnauthorized = () => {}) {
  const state = createVideoEditorState(onUnauthorized)
  state.event = editorLoader.toEvent([manifest(), new Map()])
  fill(state, manifest())
  return state
}

beforeEach(() => api.reset())
afterEach(() => vi.restoreAllMocks())

describe('manifest の組み立て', () => {
  it('editorLoader.toEvent は、読み込んだ manifest のシリーズ・イベントの情報を取り出す', () => {
    expect(editorLoader.toEvent([manifest(), new Map()])).toEqual({
      series: manifest().series,
      event: manifest().event,
    })
  })

  it('fill で書き写した内容から、取り込みと同じ形の manifest を作る (イベントの情報は選んだイベントのもの)', () => {
    const state = filledState()
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
    const state = filledState()
    const [first, second] = state.rows
    if (first) first.performersText = '1, x'
    if (second) second.durationSec = null
    expect(buildManifest(state).problems).toEqual([
      '出演は No. をカンマで区切って書いてください: 予選/1.mp4',
      '長さ (秒) を書いてください: 本戦/2.mp4',
    ])
  })

  it('イベントを選んでいなければ、manifest を作らない', () => {
    const state = createVideoEditorState(() => {})
    expect(buildManifest(state)).toEqual({
      manifest: null,
      problems: ['イベントを選んでください'],
    })
  })
})

describe('登録・読み込み・削除', () => {
  it('editorLoader で読み込むと、イベントと R2 の一覧を読み込み、選んだイベントとして覚える', async () => {
    const state = createVideoEditorState(() => {})
    await loadSelectedEvent(
      state,
      { seriesId: 's', eventId: 'e' },
      editorLoader,
    )
    expect(api.calls.sort()).toEqual([
      'GET /api/admin/events/s/e',
      'GET /api/admin/objects?series=s&event=e',
    ])
    expect(state.event?.event.id).toBe('e')
    expect(state.remote).toEqual(new Map([['予選/1.mp4', 10]]))
  })

  it('editorLoader での読み込みに失敗したら、前に選んでいたイベントを外したままにする (選んだものと中身をずらさない)', async () => {
    const state = filledState()
    vi.spyOn(adminApi, 'getEvent').mockRejectedValueOnce(
      new Error('読めません'),
    )
    await loadSelectedEvent(
      state,
      { seriesId: 's', eventId: 'f' },
      editorLoader,
    )
    expect(state.event).toBeNull()
    expect(state.rows).toEqual([])
    expect(state.messages).toEqual({ kind: 'error', lines: ['読めません'] })
  })

  it('register は、確かめるだけなら dryRun を付けて送る', async () => {
    const state = filledState()
    expect(await register(state, true)).toBe(true)
    expect(await register(state, false)).toBe(true)
    expect(api.calls).toEqual([
      'POST /api/admin/events?dryRun=1',
      'POST /api/admin/events',
    ])
  })

  it('register は、イベントを選んでいなければ送らずにエラーを出す', async () => {
    const state = createVideoEditorState(() => {})
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
    const state = filledState(onUnauthorized)
    expect(await register(state, false)).toBe(false)
    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(state.messages?.kind).toBe('error')
    expect(state.busy).toBe(false)
  })

  it('選んだイベントを外すと、書いた内容と R2 の一覧も空に戻す', () => {
    const state = filledState()
    state.remote = new Map()
    unselect(state, editorLoader)
    expect(state.event).toBeNull()
    expect(state.rows).toEqual([])
    expect(state.entriesText).toBe('')
    expect(state.remote).toBeNull()
  })
})
