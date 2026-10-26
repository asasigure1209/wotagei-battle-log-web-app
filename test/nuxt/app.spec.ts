import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import App from '~/app.vue'
import { getEvent, getPlayer, listPlayers } from '~~/server/utils/repository'

// nuxt 環境のテストではサーバー (Nitro) が動かないので、API の応答を
// API のハンドラと同じリポジトリの戻り値に差し替える
registerEndpoint('/api/elnino/elnino_vol_5', () =>
  getEvent('elnino', 'elnino_vol_5'),
)
registerEndpoint('/api/elnino/elnino_vol_5/players', () =>
  listPlayers('elnino', 'elnino_vol_5'),
)
registerEndpoint('/api/elnino/elnino_vol_5/players/05', () =>
  getPlayer('elnino', 'elnino_vol_5', '05'),
)

describe('イベントページ', () => {
  it('出場プレイヤーを並べ、それぞれの動画一覧ページへリンクする', async () => {
    const wrapper = await mountSuspended(App, {
      route: '/elnino/elnino_vol_5',
    })
    const links = wrapper.findAll('a[href*="/players/"]')
    expect(links).toHaveLength(22)
    expect(links[4]?.attributes('href')).toBe('/elnino/elnino_vol_5/players/05')
    expect(links[4]?.text()).toContain('はやて')
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
