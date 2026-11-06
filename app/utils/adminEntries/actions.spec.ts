import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '~/utils/adminApi'
import { loadSelectedEvent, unselect } from '~/utils/adminCommon/eventSelection'
import { entriesLoader, save } from '~/utils/adminEntries/actions'
import { createEntriesFormState } from '~/utils/adminEntries/state'
import { eventInfo, fakeAdminApi } from '~~/test/nuxt/adminTestUtils'

/** 登録済みのエントリー。No. の順に並ばずに返ってきても、No. の順に並べる */
const manifest = () => ({
  ...eventInfo(),
  entries: [
    { entryNo: 2, name: 'しぐれ' },
    { entryNo: 1, name: 'BLAZE' },
  ],
  videos: [],
})

const api = fakeAdminApi([
  { method: 'GET', path: '/api/admin/events/s/e', body: manifest() },
  { method: 'PUT', path: '/api/admin/events/s/e/entries', body: { ok: true } },
  // No. に抜けがある (db:import や動画の画面で「1: A / 3: C」のように作れる)
  {
    method: 'GET',
    path: '/api/admin/events/s/gap',
    body: {
      ...eventInfo(),
      entries: [
        { entryNo: 3, name: 'C' },
        { entryNo: 1, name: 'A' },
      ],
      videos: [],
    },
  },
])

const GAP_PROBLEM =
  '登録済みのエントリーの No. に抜けがあります (1, 3)。この画面で登録すると No. が振り直されて動画の出演者がずれるので、登録できません。動画の登録の画面のエントリーの欄で No. を 1 から抜けなく付け直し、出演 No. も合わせて直してから登録してください'

beforeEach(() => api.reset())
afterEach(() => vi.restoreAllMocks())

/** 登録済みのイベント s/e を選んで、names を書いた状態 */
function stateWithNames(namesText: string, onUnauthorized = () => {}) {
  const state = createEntriesFormState(onUnauthorized)
  state.event = eventInfo()
  state.namesText = namesText
  return state
}

describe('選んだイベントの読み込み', () => {
  it('登録済みのエントリーの名前を、No. の順に 1 行ずつ並べる', async () => {
    const state = createEntriesFormState(() => {})
    await loadSelectedEvent(
      state,
      { seriesId: 's', eventId: 'e' },
      entriesLoader,
    )
    expect(api.calls).toEqual(['GET /api/admin/events/s/e'])
    expect(state.event).toEqual(eventInfo())
    expect(state.namesText).toBe('BLAZE\nしぐれ')
  })

  it('登録済みのエントリーの No. に抜けがあれば、誤りを出し、登録できないようにする', async () => {
    const state = createEntriesFormState(() => {})
    await loadSelectedEvent(
      state,
      { seriesId: 's', eventId: 'gap' },
      entriesLoader,
    )
    expect(state.namesText).toBe('A\nC')
    expect(state.entryNosProblem).toBe(GAP_PROBLEM)
    expect(state.messages).toEqual({ kind: 'error', lines: [GAP_PROBLEM] })
    expect(await save(state, true)).toBe(false)
    expect(api.calls).toEqual(['GET /api/admin/events/s/gap'])
    expect(state.messages).toEqual({ kind: 'error', lines: [GAP_PROBLEM] })
  })

  it('No. に抜けのないイベントを選び直すと、誤りを外す', async () => {
    const state = createEntriesFormState(() => {})
    state.entryNosProblem = GAP_PROBLEM
    await loadSelectedEvent(
      state,
      { seriesId: 's', eventId: 'e' },
      entriesLoader,
    )
    expect(state.entryNosProblem).toBe('')
    expect(state.messages).toBeNull()
  })

  it('選んだイベントを外すと、書いた名前と登録できたことを忘れる', () => {
    const state = stateWithNames('BLAZE')
    state.registered = true
    unselect(state, entriesLoader)
    expect(state.namesText).toBe('')
    expect(state.registered).toBe(false)
  })
})

describe('登録', () => {
  it('書いた名前を、空行と前後の空白を除いて、書いた順に送る', async () => {
    const spy = vi.spyOn(adminApi, 'saveEntries')
    const state = stateWithNames(' BLAZE \n\nしぐれ\n')
    expect(await save(state, false)).toBe(true)
    expect(spy).toHaveBeenCalledWith(
      { seriesId: 's', eventId: 'e' },
      ['BLAZE', 'しぐれ'],
      false,
    )
    expect(api.calls).toEqual(['PUT /api/admin/events/s/e/entries'])
    expect(state.messages?.kind).toBe('info')
    expect(state.registered).toBe(true)
    // 送った名前に書き直す (登録したものと画面が同じになる)
    expect(state.namesText).toBe('BLAZE\nしぐれ')
  })

  it('確認だけなら dryRun で送り、登録できたことにはしない', async () => {
    const state = stateWithNames('BLAZE')
    expect(await save(state, true)).toBe(true)
    expect(api.calls).toEqual(['PUT /api/admin/events/s/e/entries?dryRun=1'])
    expect(state.messages).toEqual({
      kind: 'info',
      lines: ['問題ありません。このまま登録できます'],
    })
    expect(state.registered).toBe(false)
  })

  it('名前が 1 人もいなければ、送らずに誤りにする', async () => {
    const state = stateWithNames(' \n')
    expect(await save(state, false)).toBe(false)
    expect(api.calls).toEqual([])
    expect(state.messages?.kind).toBe('error')
  })

  it('イベントを選んでいなければ、送らずに誤りにする', async () => {
    const state = createEntriesFormState(() => {})
    state.namesText = 'BLAZE'
    expect(await save(state, false)).toBe(false)
    expect(api.calls).toEqual([])
    expect(state.messages).toEqual({
      kind: 'error',
      lines: ['イベントを選んでください'],
    })
  })

  it('サーバーが弾いたときは、その誤りをそのまま出す', async () => {
    const problem =
      'エントリー No. 3 は動画に出ているので消せません (ほかの行を消すと No. がずれます)'
    vi.spyOn(adminApi, 'saveEntries').mockRejectedValueOnce(
      Object.assign(new Error('Bad Request'), {
        statusCode: 400,
        data: { data: { problems: [problem] } },
      }),
    )
    const state = stateWithNames('BLAZE')
    expect(await save(state, false)).toBe(false)
    expect(state.messages).toEqual({ kind: 'error', lines: [problem] })
    expect(state.registered).toBe(false)
  })

  it('ログインが切れていたら onUnauthorized を呼ぶ', async () => {
    api.unauthorized = true
    const onUnauthorized = vi.fn()
    const state = stateWithNames('BLAZE', onUnauthorized)
    expect(await save(state, false)).toBe(false)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
})
