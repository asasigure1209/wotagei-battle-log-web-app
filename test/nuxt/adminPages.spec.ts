import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { createError } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '~/app.vue'

const registered = {
  seriesId: 's',
  seriesName: 'シリーズ',
  eventId: 'e',
  eventName: 'イベント',
  date: '2026-01-01',
  contact: '連絡先',
}

/** 偽の API の振る舞い。テストごとに beforeEach で戻す */
const api = {
  /** ログインしているか (/api/admin/session が 200 か) */
  loggedIn: true,
  /** 登録済みのイベントの一覧を、ログイン切れ (401) にするか */
  listUnauthorized: false,
  logouts: 0,
}

const unauthorized = () =>
  createError({ status: 401, statusText: 'Unauthorized' })

registerEndpoint('/api/admin/session', () => {
  if (!api.loggedIn) throw unauthorized()
  return { ok: true }
})
registerEndpoint('/api/admin/logout', {
  method: 'POST',
  handler: () => {
    api.logouts++
    return { ok: true }
  },
})
registerEndpoint('/api/admin/events', () => {
  if (api.listUnauthorized) throw unauthorized()
  return [registered]
})

beforeEach(() => {
  Object.assign(api, { loggedIn: true, listUnauthorized: false, logouts: 0 })
})

/** route を開き、ログインの確認と一覧の読み込みが終わるまで待つ */
async function open(route: string) {
  const wrapper = await mountSuspended(App, { route })
  await vi.waitFor(async () => {
    await flushPromises()
    expect(wrapper.find('.admin').element.children.length).toBeGreaterThan(0)
  })
  await flushPromises()
  return wrapper
}

describe('管理画面のページ', () => {
  it('ログインしていなければ、どのページでもログインの画面を出す', async () => {
    api.loggedIn = false
    for (const route of ['/admin', '/admin/events', '/admin/entries']) {
      const wrapper = await open(route)
      expect(wrapper.find('input[type="password"]').exists()).toBe(true)
      expect(wrapper.find('.bar').exists()).toBe(false)
    }
  })

  it('/admin は入り口として、イベントの登録とエントリー・動画の登録へのリンクを出す', async () => {
    const wrapper = await open('/admin')
    const hrefs = wrapper.findAll('nav a').map((a) => a.attributes('href'))
    expect(hrefs).toEqual(['/admin/events', '/admin/entries'])
  })

  it('/admin/events は、?event= のイベントを選んだ状態で開く', async () => {
    const wrapper = await open('/admin/events?event=s%2Fe')
    await vi.waitFor(() =>
      expect(wrapper.find<HTMLSelectElement>('select').element.value).toBe(
        's/e',
      ),
    )
    expect(
      wrapper.find<HTMLInputElement>('input[placeholder="elnino"]').element
        .disabled,
    ).toBe(true)
  })

  it('/admin/entries は、イベントを選ぶまでエントリー・動画の欄を出さない', async () => {
    const wrapper = await open('/admin/entries')
    await vi.waitFor(() =>
      expect(wrapper.findAll('option').map((o) => o.text())).toContainEqual(
        expect.stringContaining('イベント (s/e)'),
      ),
    )
    expect(wrapper.text()).not.toContain('2. エントリー')
  })

  it('配下のページで API がログイン切れを返したら、ログインの画面に戻す', async () => {
    api.listUnauthorized = true
    const wrapper = await open('/admin/events')
    await vi.waitFor(() =>
      expect(wrapper.find('input[type="password"]').exists()).toBe(true),
    )
  })

  it('ログアウトすると、ログインの画面に戻す', async () => {
    const wrapper = await open('/admin')
    await wrapper.find('.bar button').trigger('click')
    await vi.waitFor(() =>
      expect(wrapper.find('input[type="password"]').exists()).toBe(true),
    )
    expect(api.logouts).toBe(1)
  })
})
