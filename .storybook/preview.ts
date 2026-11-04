import { type Preview, setup } from '@storybook/vue3-vite'
import { defineComponent, h } from 'vue'
import '../app/assets/css/main.css'

// Nuxt なしで動くので、NuxtLink はただの <a> に置き換える (遷移はしない)
setup((app) => {
  app.component(
    'NuxtLink',
    defineComponent({
      props: { to: { type: String, required: true } },
      setup:
        (props, { slots }) =>
        () =>
          h('a', { href: props.to }, slots),
    }),
  )
})

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
  // Storybook は Nuxt なしで動き $fetch がないので、ストーリーごとに parameters.fetch の値を返す (Error なら投げる)
  // $fetch を置き、終わったら元に戻す。指定のないストーリーで API を呼ぶと失敗する
  beforeEach: ({ parameters }) => {
    const g = globalThis as { $fetch?: unknown }
    const previous = g.$fetch
    g.$fetch = async () => {
      const result: unknown = parameters.fetch
      if (result === undefined) {
        throw new Error(
          'parameters.fetch を指定していないストーリーで API を呼びました',
        )
      }
      if (result instanceof Error) throw result
      return result
    }
    return () => {
      g.$fetch = previous
    }
  },
  decorators: [
    (_story, { parameters }) => ({
      setup: () => ({ maxWidth: parameters.maxWidth ?? '390px' }),
      template:
        "<div :style=\"{ maxWidth, color: 'var(--color-text)', fontFamily: 'var(--font-body)' }\"><story /></div>",
    }),
  ],
}

export default preview
