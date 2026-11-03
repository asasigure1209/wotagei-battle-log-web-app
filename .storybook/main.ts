import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/vue3-vite'
import vue from '@vitejs/plugin-vue'

const config: StorybookConfig = {
  stories: ['../app/**/*.stories.ts'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-vitest',
    '@chromatic-com/storybook',
  ],
  framework: {
    name: '@storybook/vue3-vite',
    options: {
      // ルートの tsconfig は references 構成なので、Nuxt が生成する app 用を指す
      docgen: {
        plugin: 'vue-component-meta',
        tsconfig: '.nuxt/tsconfig.app.json',
      },
    },
  },
  // Nuxt プロジェクトには vite.config がないので、Vue プラグインと、Nuxt と同じパスの別名 (~ は app/、~~ はルート) をここで足す
  viteFinal: (config) => ({
    ...config,
    plugins: [...(config.plugins ?? []), vue()],
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        '~~': fileURLToPath(new URL('..', import.meta.url)),
        '~': fileURLToPath(new URL('../app', import.meta.url)),
      },
    },
  }),
}

export default config
