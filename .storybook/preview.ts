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
  // モックはスマホの幅 (390px) で作られているので、その幅に収める。管理画面のように広い画面で使うものは、
  // parameters.maxWidth で幅を変える。
  // docs ページでは Storybook の文字色とフォントが継承されるので、アプリの body と同じものを付け直す
  decorators: [
    (_story, { parameters }) => ({
      setup: () => ({ maxWidth: parameters.maxWidth ?? '390px' }),
      template:
        "<div :style=\"{ maxWidth, color: 'var(--color-text)', fontFamily: 'var(--font-body)' }\"><story /></div>",
    }),
  ],
}

export default preview
