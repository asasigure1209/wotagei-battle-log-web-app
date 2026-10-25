// https://nuxt.com/docs/api/configuration/nuxt-config
import { randomUUID } from 'node:crypto'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    // API (/api/**) を、このアプリのサーバーからの呼び出しだけに限るための合言葉。
    // サーバー側にしか渡らない非公開の値。本番では NUXT_API_SECRET で指定し、
    // 指定がなければビルドごと (dev では起動ごと) にランダムな値にする
    apiSecret: randomUUID(),
  },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'ja' },
      // モック (mock-ui-html) で使っているフォント。CSS の @import より先に読み始められるよう head に置く。
      // 同じものを .storybook/preview-head.html にも書いている
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=JetBrains+Mono:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap',
        },
      ],
    },
  },
})
