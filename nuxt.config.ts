// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
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
