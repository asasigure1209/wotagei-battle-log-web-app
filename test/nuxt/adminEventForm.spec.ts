import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createEventFormEditor } from '~/utils/adminEditor/eventForm'
import { fakeAdminApi } from './adminTestUtils'

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
  { method: 'POST', path: '/api/admin/events', body: { ok: true } },
  { method: 'DELETE', path: '/api/admin/events/s/e', body: { ok: true } },
])

beforeEach(() => api.reset())

/** 登録済みのイベントの一覧を読んだエディター */
async function loadedEditor(onUnauthorized = () => {}) {
  const editor = createEventFormEditor(onUnauthorized)
  await editor.reload()
  api.reset()
  return editor
}

describe('イベントの登録の画面', () => {
  it('open で登録済みのイベントを書き写し、空なら新しいイベントを書き始める', async () => {
    const editor = await loadedEditor()
    editor.open('s/e')
    expect(editor.state.loaded).toBe(true)
    expect(editor.state.form).toEqual({
      seriesId: 's',
      seriesName: 'シリーズ',
      eventId: 'e',
      eventName: 'イベント',
      date: '2026-01-01',
      contact: '連絡先',
    })
    editor.open('')
    expect(editor.state.loaded).toBe(false)
    expect(editor.state.form.seriesId).toBe('')
  })

  it('新しいイベントを登録すると、一覧を読み直し、登録したイベントを選んだことにする', async () => {
    const editor = await loadedEditor()
    Object.assign(editor.state.form, { seriesId: 's', eventId: 'f' })
    expect(await editor.save()).toBe(true)
    expect(api.calls).toEqual([
      'POST /api/admin/events?create=1',
      'GET /api/admin/events',
    ])
    expect(editor.state.loaded).toBe(true)
    expect(editor.state.messages?.kind).toBe('info')
  })

  it('選んだイベントを書き換えるときは、作るだけにせず書き換える', async () => {
    const editor = await loadedEditor()
    editor.open('s/e')
    expect(await editor.save()).toBe(true)
    expect(api.calls).toEqual([
      'POST /api/admin/events',
      'GET /api/admin/events',
    ])
  })

  it('新しく作るときに、登録済みの ID を書いたら、上書きしないよう送らない', async () => {
    const editor = await loadedEditor()
    Object.assign(editor.state.form, { seriesId: 's', eventId: 'e' })
    expect(editor.duplicated.value).toBe(true)
    expect(await editor.save()).toBe(false)
    expect(api.calls).toEqual([])
    expect(editor.state.messages?.kind).toBe('error')
  })

  it('選んだイベントを消すと、新しいイベントを書き始める', async () => {
    const editor = await loadedEditor()
    expect(await editor.remove()).toBe(false)
    editor.open('s/e')
    expect(await editor.remove()).toBe(true)
    expect(api.calls).toEqual([
      'DELETE /api/admin/events/s/e',
      'GET /api/admin/events',
    ])
    expect(editor.state.loaded).toBe(false)
    expect(editor.state.form.eventId).toBe('')
  })

  it('ログインが切れていたら onUnauthorized を呼ぶ', async () => {
    const onUnauthorized = vi.fn()
    const editor = await loadedEditor(onUnauthorized)
    editor.open('s/e')
    api.unauthorized = true
    expect(await editor.save()).toBe(false)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
})
