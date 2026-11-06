import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '~/app.vue'

// nuxt 環境のテストではサーバー (Nitro) も DB も動かないので、API の応答を差し替える
registerEndpoint('/api/elnino/elnino_vol_5', () => ({
  title: 'エルニーニョ vol.5',
  date: '2026-01-01',
  contact: '[運営の連絡先]',
}))
registerEndpoint('/api/elnino/elnino_vol_5/players', () => [
  { no: '01', name: 'BLAZE', count: 3 },
  { no: '02', name: 'しぐれ', count: 1 },
  { no: '03', name: 'あおば', count: 1 },
  { no: '04', name: 'K-ROCK', count: 2 },
  { no: '05', name: 'はやて', count: 3 },
])
registerEndpoint('/api/elnino/elnino_vol_5/players/05', () => ({
  no: '05',
  name: 'はやて',
  count: 3,
  videos: [
    { no: '01', file: 'video_03.mp4', duration: '03:40', mb: 742 },
    { no: '02', file: 'video_06.mp4', duration: '02:12', mb: 688 },
    { no: '03', file: 'video_07.mp4', duration: '04:05', mb: 815 },
  ],
}))

describe('イベントページ', () => {
  it('出場プレイヤーを並べ、それぞれの動画一覧ページへリンクする', async () => {
    const wrapper = await mountSuspended(App, {
      route: '/elnino/elnino_vol_5',
    })
    const links = wrapper.findAll('a[href*="/players/"]')
    expect(links).toHaveLength(5)
    expect(links[4]?.attributes('href')).toBe('/elnino/elnino_vol_5/players/05')
    expect(links[4]?.text()).toContain('はやて')
  })

  it('ないイベントは 404 にする', async () => {
    const wrapper = await mountSuspended(App, {
      route: '/elnino/elnino_vol_99',
    })
    expect(wrapper.findAll('a[href*="/players/"]')).toHaveLength(0)
  })

  it('英数字と _ - 以外を含むイベント ID は、配下のページも 404 にする', async () => {
    const wrapper = await mountSuspended(App, {
      route: '/elnino/vol%205/players/05',
    })
    expect(wrapper.text()).not.toContain('はやて')
  })
})

describe('プレイヤーの動画一覧ページ', () => {
  // 保存は <a> の click で始まるので、実際には遷移させず、開こうとした URL を記録する
  const downloads: (string | null)[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloads.push(this.getAttribute('href'))
  })
  afterEach(() => {
    downloads.length = 0
  })

  async function mountPlayerPage() {
    const wrapper = await mountSuspended(App, {
      route: '/elnino/elnino_vol_5/players/05',
    })
    const button = (label: string) => {
      const found = wrapper.findAll('button').find((b) => b.text() === label)
      if (!found) throw new Error(`「${label}」のボタンがない`)
      return found
    }
    return { wrapper, button }
  }

  it('動画のダウンロードボタンで、その動画を保存し、保存済みにする', async () => {
    const { wrapper } = await mountPlayerPage()
    expect(wrapper.text()).not.toContain('保存済み')

    await wrapper
      .find('button[aria-label="video_06.mp4 をダウンロード"]')
      .trigger('click')
    expect(downloads).toEqual(['/download/elnino/elnino_vol_5/players/05/02'])
    expect(wrapper.text()).toContain('保存済み')
  })

  it('選択モードで選んだ動画を、画面下のバーとまとめてダウンロードのシートに出し、1 本ずつ保存する', async () => {
    const { wrapper, button } = await mountPlayerPage()

    await button('選択').trigger('click')
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    await checkboxes[0]?.setValue(true)
    await checkboxes[2]?.setValue(true)
    expect(wrapper.text()).toContain('2本を選択中')
    expect(wrapper.text()).toContain('1.6 GB')

    await button('ダウンロード').trigger('click')
    const sheet = wrapper.find('dialog')
    expect(sheet.attributes()).toHaveProperty('open')
    expect(sheet.text()).toContain('2本 · 1.6 GB')

    await button('ダウンロードを開始').trigger('click')
    expect(sheet.text()).toContain('順番に保存しています')
    expect(sheet.text()).toContain('1 / 2 本')
    // 2 本目は間を空けてから始めるので、まだ 1 本目だけ
    expect(downloads).toEqual(['/download/elnino/elnino_vol_5/players/05/01'])

    // 選択モードを抜ける「キャンセル」もあるので、シートの中から探す
    await sheet
      .findAll('button')
      .find((b) => b.text() === 'キャンセル')
      ?.trigger('click')
    expect(sheet.attributes()).not.toHaveProperty('open')
  })
})

describe('管理画面', () => {
  // ログインしている (session が 200 を返す) ことにする。登録済みのイベントは 1 つ
  registerEndpoint('/api/admin/session', () => ({ ok: true }))
  registerEndpoint('/api/admin/events', () => [
    {
      seriesId: 'elnino',
      seriesName: 'エルニーニョ',
      eventId: 'elnino_vol_5',
      eventName: 'エルニーニョ vol.5',
      date: '2026-01-01',
      contact: 'X: @elnino',
    },
  ])
  // そのイベントの登録済みの内容と、R2 の動画 (まだない)
  registerEndpoint('/api/admin/events/elnino/elnino_vol_5', () => ({
    series: { id: 'elnino', name: 'エルニーニョ' },
    event: {
      id: 'elnino_vol_5',
      name: 'エルニーニョ vol.5',
      date: '2026-01-01',
      contact: 'X: @elnino',
    },
    entries: [{ entryNo: 1, name: 'BLAZE' }],
    videos: [],
  }))
  registerEndpoint('/api/admin/objects', () => [])

  it('/admin は入口で、イベントの登録と、エントリーと動画の登録のページへ案内する', async () => {
    const wrapper = await mountSuspended(App, { route: '/admin' })
    await vi.waitFor(() =>
      expect(wrapper.find('a[href="/admin/videos"]').exists()).toBe(true),
    )
    expect(wrapper.find('a[href="/admin/events"]').exists()).toBe(true)
    // 入口には登録の画面そのものは出さない
    expect(wrapper.text()).not.toContain('1 行に 1 人')
  })

  it('/admin/videos で、エントリーと動画を登録する', async () => {
    const wrapper = await mountSuspended(App, { route: '/admin/videos' })
    await vi.waitFor(() => expect(wrapper.text()).toContain('1 行に 1 人'))
    // ヘッダーから入口へ戻れる
    expect(wrapper.find('a[href="/admin"]').exists()).toBe(true)
  })

  it('/admin/events で、イベントを登録する', async () => {
    const wrapper = await mountSuspended(App, { route: '/admin/events' })
    await vi.waitFor(() =>
      expect(wrapper.text()).toContain('新しいイベントを作る'),
    )
    // エントリーの欄はない
    expect(wrapper.text()).not.toContain('1 行に 1 人')
  })
  it('/admin/events?event= で開くと、そのイベントを選んで直せる', async () => {
    const wrapper = await mountSuspended(App, {
      route: '/admin/events?event=elnino/elnino_vol_5',
    })
    await vi.waitFor(() =>
      expect(
        wrapper.find<HTMLInputElement>('input[placeholder="elnino_vol_5"]')
          .element.value,
      ).toBe('elnino_vol_5'),
    )
  })
  it('/admin/videos?event= で開くと、そのイベントを選んで、エントリーを書ける', async () => {
    const wrapper = await mountSuspended(App, {
      route: '/admin/videos?event=elnino/elnino_vol_5',
    })
    await vi.waitFor(() =>
      expect(wrapper.find('textarea').element.value).toBe('1: BLAZE'),
    )
    expect(wrapper.find('textarea').attributes()).not.toHaveProperty('disabled')
  })
  it('前の URL の /admin/entries?event= で開くと、?event= を引き継いで /admin/videos に移る', async () => {
    const wrapper = await mountSuspended(App, {
      route: '/admin/entries?event=elnino/elnino_vol_5',
    })
    expect(useRoute().fullPath).toBe('/admin/videos?event=elnino/elnino_vol_5')
    await vi.waitFor(() =>
      expect(wrapper.find('textarea').element.value).toBe('1: BLAZE'),
    )
  })
})
