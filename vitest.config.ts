import { defineVitestProject } from '@nuxt/test-utils/config'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      await defineVitestProject({
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.spec.ts'],
          environment: 'nuxt',
        },
      }),
      {
        // サーバーの処理を、テスト用の SQLite ファイルにつないで確かめる
        test: {
          name: 'server',
          include: ['test/server/**/*.spec.ts'],
          environment: 'node',
          // どのテストファイルも同じテスト用の DB ファイルを作り直して使うので、1 つずつ流す
          fileParallelism: false,
          // 中継 Worker の指定があっても、テストはローカルのファイルだけを使う
          env: {
            NUXT_DATABASE_URL: 'file:.data/test.sqlite',
            NUXT_D1_PROXY_URL: '',
          },
        },
      },
      {
        plugins: [storybookTest()],
        // 初回実行時 (CI など) に後から最適化されると Vite がリロードしてテストが落ちるため、先に含めておく
        optimizeDeps: { include: ['vue'] },
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})
