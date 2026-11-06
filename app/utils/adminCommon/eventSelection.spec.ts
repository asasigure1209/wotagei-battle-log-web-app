import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi, type EventIds } from '~/utils/adminApi'
import {
  createEventSelectionState,
  type EventLoader,
  type EventSelectionState,
  eventSelection,
  hasEvent,
  loadSelectedEvent,
  reloadEvents,
  selectedIds,
  selectedKey,
  unselect,
} from '~/utils/adminCommon/eventSelection'
import {
  eventInfo,
  fakeAdminApi,
  registeredEvent,
} from '~~/test/nuxt/adminTestUtils'

const api = fakeAdminApi([
  {
    method: 'GET',
    path: '/api/admin/events',
    body: [registeredEvent],
  },
])

beforeEach(() => api.reset())
afterEach(() => vi.restoreAllMocks())

/** 選んだイベントのほかに、読み込んだ文を 1 つ持つ画面の状態 */
type TestState = EventSelectionState & { text: string }

const createState = (onUnauthorized = () => {}): TestState => ({
  ...createEventSelectionState(onUnauthorized),
  text: '',
})

/** 読み込んだイベント ID のイベント */
function eventOf(eventId: string) {
  const info = eventInfo()
  return { ...info, event: { ...info.event, id: eventId } }
}

/** ids のイベントを読み、そのイベント ID を text に書き写す読み込み方 */
function testLoader(
  fetch: (ids: EventIds) => Promise<string> = async (ids) => ids.eventId,
): EventLoader<TestState, string> {
  return {
    fetch,
    toEvent: eventOf,
    fill: (state, text) => {
      state.text = text
    },
    reset: (state) => {
      state.text = ''
    },
  }
}

describe('登録済みのイベントの一覧', () => {
  it('reloadEvents で読み、hasEvent でキーが一覧にあるかを見分ける', async () => {
    const state = createState()
    await reloadEvents(state)
    expect(api.calls).toEqual(['GET /api/admin/events'])
    expect(hasEvent(state, 's/e')).toBe(true)
    expect(hasEvent(state, 's/x')).toBe(false)
  })

  it('読み込みに失敗したら、画面にエラーを出す (401 ならログインの画面に戻す)', async () => {
    api.unauthorized = true
    const onUnauthorized = vi.fn()
    const state = createState(onUnauthorized)
    await reloadEvents(state)
    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(state.messages?.kind).toBe('error')
    expect(state.busy).toBe(false)
  })
})

describe('選んだイベント', () => {
  it('selectedIds と selectedKey は、選んだイベントから作る (選んでいなければ null と空)', () => {
    const state = createState()
    expect(selectedIds(state)).toBeNull()
    expect(selectedKey(state)).toBe('')
    state.event = eventInfo()
    expect(selectedIds(state)).toEqual({ seriesId: 's', eventId: 'e' })
    expect(selectedKey(state)).toBe('s/e')
  })

  it('unselect は、選んだイベントと知らせを外し、画面の内容を空に戻す', () => {
    const state = createState()
    state.event = eventInfo()
    state.text = 'e'
    state.messages = { kind: 'info', lines: ['登録しました'] }
    unselect(state, testLoader())
    expect(state.event).toBeNull()
    expect(state.text).toBe('')
    expect(state.messages).toBeNull()
  })
})

describe('選んだイベントの読み込み', () => {
  it('loadSelectedEvent は、読み込んだ結果から選んだイベントを入れ、画面に書き写す', async () => {
    const state = createState()
    await loadSelectedEvent(
      state,
      { seriesId: 's', eventId: 'e' },
      testLoader(),
    )
    expect(state.event).toEqual(eventInfo())
    expect(state.text).toBe('e')
    expect(state.busy).toBe(false)
  })

  it('失敗したら、前に選んでいたイベントを外したままにし、エラーを出す', async () => {
    const state = createState()
    state.event = eventInfo()
    state.text = 'e'
    const loader = testLoader(async () => {
      throw new Error('読めません')
    })
    await loadSelectedEvent(state, { seriesId: 's', eventId: 'f' }, loader)
    expect(state.event).toBeNull()
    expect(state.text).toBe('')
    expect(state.messages).toEqual({ kind: 'error', lines: ['読めません'] })
  })

  it('読み込みを待つ間に選び直したら、古い結果を捨て、最後に選んだものだけを使う', async () => {
    const state = createState()
    let finishFirst: (text: string) => void = () => {}
    const fetch = vi
      .fn<(ids: EventIds) => Promise<string>>()
      .mockImplementationOnce(() => new Promise((r) => (finishFirst = r)))
      .mockResolvedValueOnce('f')
    const loader = testLoader(fetch)
    const first = loadSelectedEvent(
      state,
      { seriesId: 's', eventId: 'e' },
      loader,
    )
    await loadSelectedEvent(state, { seriesId: 's', eventId: 'f' }, loader)
    finishFirst('e')
    await first
    expect(state.event).toEqual(eventOf('f'))
    expect(state.text).toBe('f')
  })

  it('読み込みを待つ間に選んだイベントを外したら、その結果を使わない', async () => {
    const state = createState()
    let finish: (text: string) => void = () => {}
    const loader = testLoader(() => new Promise((r) => (finish = r)))
    const loading = loadSelectedEvent(
      state,
      { seriesId: 's', eventId: 'e' },
      loader,
    )
    unselect(state, loader)
    finish('e')
    await loading
    expect(state.event).toBeNull()
    expect(state.text).toBe('')
  })
})

describe('eventSelection', () => {
  it('open は、一覧にあるイベントを読み込む', async () => {
    const state = createState()
    const selection = eventSelection(state, testLoader())
    await selection.reload()
    await selection.open('s/e')
    expect(state.text).toBe('e')
  })

  it('open に空を渡すと、選んだイベントを外す', async () => {
    const state = createState()
    state.event = eventInfo()
    state.text = 'e'
    await eventSelection(state, testLoader()).open('')
    expect(state.event).toBeNull()
    expect(state.text).toBe('')
  })

  it('open は、一覧にないイベントなら読み込まず、そのことを知らせる', async () => {
    const state = createState()
    const fetch = vi.fn(async () => 'x')
    const selection = eventSelection(state, testLoader(fetch))
    await selection.reload()
    await selection.open('s/x')
    expect(fetch).not.toHaveBeenCalled()
    expect(state.event).toBeNull()
    expect(state.messages).toEqual({
      kind: 'error',
      lines: ['登録済みのイベントに見つかりません: s/x'],
    })
  })
})

describe('eventSelection の start', () => {
  it('一覧を読んでから、initialEvent を開く', async () => {
    const state = createState()
    await eventSelection(state, testLoader()).start('s/e')
    expect(api.calls).toEqual(['GET /api/admin/events'])
    expect(state.event).toEqual(eventInfo())
    expect(state.text).toBe('e')
  })

  it('initialEvent が空なら、一覧を読むだけにする', async () => {
    const state = createState()
    const fetch = vi.fn(async () => 'x')
    await eventSelection(state, testLoader(fetch)).start('')
    expect(state.registeredEvents).toEqual([registeredEvent])
    expect(fetch).not.toHaveBeenCalled()
    expect(state.messages).toBeNull()
  })

  it('一覧を読めなければ initialEvent を開かず、読めなかった誤りを残す', async () => {
    vi.spyOn(adminApi, 'listEvents').mockRejectedValueOnce(
      new Error('一覧を読めませんでした'),
    )
    const state = createState()
    const fetch = vi.fn(async () => 'e')
    await eventSelection(state, testLoader(fetch)).start('s/e')
    expect(fetch).not.toHaveBeenCalled()
    expect(state.messages).toEqual({
      kind: 'error',
      lines: ['一覧を読めませんでした'],
    })
  })
})
