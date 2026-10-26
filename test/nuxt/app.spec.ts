import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
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
  it('選択モードで選んだ動画を、画面下のバーとまとめてダウンロードのシートに出す', async () => {
    const wrapper = await mountSuspended(App, {
      route: '/elnino/elnino_vol_5/players/05',
    })
    const button = (label: string) => {
      const found = wrapper.findAll('button').find((b) => b.text() === label)
      if (!found) throw new Error(`「${label}」のボタンがない`)
      return found
    }

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
    expect(sheet.text()).toContain('ZIPを作成しています')
    expect(sheet.text()).toContain('996 MB / 1.6 GB')

    // 選択モードを抜ける「キャンセル」もあるので、シートの中から探す
    await sheet
      .findAll('button')
      .find((b) => b.text() === 'キャンセル')
      ?.trigger('click')
    expect(sheet.attributes()).not.toHaveProperty('open')
  })
})
