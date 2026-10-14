import type { Preview } from '@storybook/vue3-vite'
import '../app/assets/css/main.css'

const preview: Preview = {
  parameters: {
    // モックの画面と同じ背景色。docs のストーリー枠にも効く
    backgrounds: {
      options: { dark: { name: 'Dark', value: '#0a0a0d' } },
    },
  },
  initialGlobals: {
    backgrounds: { value: 'dark' },
  },
  // モックはスマホの幅 (390px) で作られているので、その幅に収める
  decorators: [
    () => ({ template: '<div style="max-width: 390px"><story /></div>' }),
  ],
}

export default preview
