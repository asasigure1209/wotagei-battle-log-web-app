import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import App from '~/app.vue'

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
    expect(wrapper.find('dialog').attributes()).toHaveProperty('open')
    const sheet = wrapper.find('[role="dialog"]')
    expect(sheet.text()).toContain('2本 · 1.6 GB')

    await button('ダウンロードを開始').trigger('click')
    expect(sheet.text()).toContain('ZIPを作成しています')
    expect(sheet.text()).toContain('996 MB / 1.6 GB')
  })
})
