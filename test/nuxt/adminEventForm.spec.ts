import { beforeEach, describe, expect, it, vi } from 'vitest'
import { adminApi } from '~/utils/adminApi'
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

  it('openInitial は一覧を読んでから選び、一覧にないイベントならそう知らせる', async () => {
    const editor = createEventFormEditor(() => {})
    await editor.openInitial('s/e')
    expect(editor.state.loaded).toBe(true)
    expect(editor.state.messages).toBeNull()
    await editor.openInitial('s/x')
    expect(editor.state.loaded).toBe(false)
    expect(editor.state.messages).toEqual({
      kind: 'error',
      lines: [expect.stringContaining('s/x は登録されていません')],
    })
  })

  it('openInitial は、一覧を読めなければ、登録されていないとは言わず、読めなかったエラーを出す', async () => {
    const listEvents = vi
      .spyOn(adminApi, 'listEvents')
      .mockRejectedValueOnce(new Error('一覧を読めません'))
    const editor = createEventFormEditor(() => {})
    await editor.openInitial('s/e')
    expect(editor.state.loaded).toBe(false)
    expect(editor.state.messages?.lines).toEqual(['一覧を読めません'])
    listEvents.mockRestore()
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

  it('シリーズ名を登録済みの名前から変えると、同じシリーズのほかのイベントの数を返す', async () => {
    const editor = await loadedEditor()
    editor.state.list = [registered, { ...registered, eventId: 'f' }]
    editor.open('s/e')
    expect(editor.seriesRename.value).toBeNull()
    editor.state.form.seriesName = '新しいシリーズ名'
    expect(editor.seriesRename.value).toEqual({ from: 'シリーズ', others: 1 })
    // 新しいイベントでも、登録済みのシリーズの名前を変えるなら同じ
    editor.open('')
    Object.assign(editor.state.form, { seriesId: 's', seriesName: '別名' })
    expect(editor.seriesRename.value).toEqual({ from: 'シリーズ', others: 2 })
  })

  it('ログインが切れていたら onUnauthorized を呼ぶ', async () => {
    const onUnauthorized = vi.fn()
    const editor = await loadedEditor(onUnauthorized)
    editor.open('s/e')
    api.unauthorized = true
    expect(await editor.save()).toBe(false)
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('idsValid は、どちらの ID も英数字と _ - だけのときだけ true', () => {
    const editor = createEventFormEditor(() => {})
    expect(editor.idsValid.value).toBe(false)
    Object.assign(editor.state.form, { seriesId: 's', eventId: 'e_1-2' })
    expect(editor.idsValid.value).toBe(true)
    editor.state.form.eventId = 'e/1'
    expect(editor.idsValid.value).toBe(false)
  })

  it('登録したときの知らせは、新しく作ったときと書き換えたときで変える', async () => {
    const editor = await loadedEditor()
    Object.assign(editor.state.form, { seriesId: 's', eventId: 'f' })
    await editor.save()
    expect(editor.state.messages?.lines[0]).toContain(
      'エントリー・動画を登録する',
    )
    editor.open('s/e')
    await editor.save()
    expect(editor.state.messages?.lines[0]).toContain(
      'エントリー・動画はそのまま',
    )
  })

  it('新しいイベントの登録に失敗したら、作ったことにせず、一覧も読み直さない', async () => {
    const editor = await loadedEditor()
    Object.assign(editor.state.form, { seriesId: 's', eventId: 'f' })
    api.unauthorized = true
    expect(await editor.save()).toBe(false)
    expect(editor.state.loaded).toBe(false)
    expect(editor.state.form.eventId).toBe('f')
    expect(api.calls).toEqual(['POST /api/admin/events?create=1'])
    expect(editor.state.messages?.kind).toBe('error')
  })

  it('消すのに失敗したら、選んだイベントと書いた内容をそのまま残す', async () => {
    const editor = await loadedEditor()
    editor.open('s/e')
    api.unauthorized = true
    expect(await editor.remove()).toBe(false)
    expect(editor.state.loaded).toBe(true)
    expect(editor.state.form.eventName).toBe('イベント')
    expect(api.calls).toEqual(['DELETE /api/admin/events/s/e'])
  })

  it('登録できても、一覧を読み直せなければ、そのエラーを出したままにする', async () => {
    const editor = await loadedEditor()
    editor.open('s/e')
    // 書き換え (POST) は通り、そのあとの一覧の読み直しだけが失敗する
    const listEvents = vi
      .spyOn(adminApi, 'listEvents')
      .mockRejectedValueOnce(new Error('一覧を読めません'))
    expect(await editor.save()).toBe(true)
    expect(editor.state.loaded).toBe(true)
    expect(editor.state.messages).toEqual({
      kind: 'error',
      lines: ['一覧を読めません'],
    })
    listEvents.mockRestore()
  })

  it('seriesRename は、まだないシリーズや、前後の空白だけの違いでは null', async () => {
    const editor = await loadedEditor()
    editor.state.list = [registered, { ...registered, eventId: 'f' }]
    editor.open('s/e')
    editor.state.form.seriesName = ' シリーズ '
    expect(editor.seriesRename.value).toBeNull()
    editor.open('')
    Object.assign(editor.state.form, { seriesId: 'new', seriesName: '新' })
    expect(editor.seriesRename.value).toBeNull()
  })
})
