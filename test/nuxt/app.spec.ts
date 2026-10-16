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
