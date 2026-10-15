import type { Preview } from '@storybook/vue3-vite'
import '../app/assets/css/main.css'

const preview: Preview = {
  parameters: {
    // モックの画面と同じ背景色。docs のストーリー枠にも効く
    backgrounds: {
      options: { dark: { name: 'Dark', value: 'var(--color-bg)' } },
    },
  },
  initialGlobals: {
    backgrounds: { value: 'dark' },
  },
  // モックはスマホの幅 (390px) で作られているので、その幅に収める。
  // docs ページでは Storybook の文字色とフォントが継承されるので、アプリの body と同じものを付け直す
  decorators: [
    () => ({
      template:
        '<div style="max-width: 390px; color: var(--color-text); font-family: var(--font-body)"><story /></div>',
    }),
  ],
}

export default preview
