import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import App from '~/app.vue'

describe('App', () => {
  it('renders the welcome page', async () => {
    const wrapper = await mountSuspended(App)
    expect(wrapper.text()).toContain('Get started')
  })
})
