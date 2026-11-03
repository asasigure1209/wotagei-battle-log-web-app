import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildManifest,
  deleteEvent,
  fill,
  loadEvent,
  register,
  reset,
} from '~/utils/adminEditor/registration'
import { createEditorState } from '~/utils/adminEditor/state'

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

/** 偽の API が受けたリクエスト (`METHOD パス`)。テストごとに空にする */
const calls: string[] = []
/** 偽の API が 401 を返すか */
let unauthorized = false

function endpoint(
  path: string,
  method: 'GET' | 'POST' | 'DELETE',
  body: unknown,
) {
  registerEndpoint(path, {
    method,
    handler: () => {
      calls.push(`${method} ${path}`)
      if (unauthorized) {
        throw createError({ status: 401, statusText: 'Unauthorized' })
      }
      return body
    },
  })
}

endpoint('/api/admin/events/s/e', 'GET', manifest())
endpoint('/api/admin/events/s/e', 'DELETE', { ok: true })
endpoint('/api/admin/objects', 'GET', [{ key: 's/e/予選/1.mp4', size: 10 }])
endpoint('/api/admin/events', 'POST', { ok: true })

beforeEach(() => {
  calls.length = 0
  unauthorized = false
})

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
    await loadEvent(state, 's/e')
    expect(calls.sort()).toEqual([
      'GET /api/admin/events/s/e',
      'GET /api/admin/objects',
    ])
    expect(state.loadedKey).toBe('s/e')
    expect(state.remote).toEqual(new Map([['予選/1.mp4', 10]]))
  })

  it('register は確かめるだけなら読み込んだことにせず、登録したら読み込んだことにする', async () => {
    const state = createEditorState(() => {})
    fill(state, manifest())
    expect(await register(state, true)).toBe(true)
    expect(state.loadedKey).toBeNull()
    expect(await register(state, false)).toBe(true)
    expect(state.loadedKey).toBe('s/e')
  })

  it('ログインが切れていたら onUnauthorized を呼び、エラーを出す', async () => {
    unauthorized = true
    const onUnauthorized = vi.fn()
    const state = createEditorState(onUnauthorized)
    fill(state, manifest())
    expect(await register(state, false)).toBe(false)
    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(state.messages?.kind).toBe('error')
    expect(state.busy).toBe(false)
  })

  it('deleteEvent は読み込んだイベントを消し、書いた内容は残す。reset で空に戻す', async () => {
    const state = createEditorState(() => {})
    fill(state, manifest())
    state.loadedKey = 's/e'
    expect(await deleteEvent(state)).toBe(true)
    expect(calls).toEqual(['DELETE /api/admin/events/s/e'])
    expect(state.loadedKey).toBeNull()
    expect(state.rows).toHaveLength(2)
    reset(state)
    expect(state.rows).toEqual([])
    expect(state.form.seriesId).toBe('')
  })
})
