// https://nuxt.com/docs/api/configuration/nuxt-config
import { randomUUID } from 'node:crypto'

// ISR で描画結果を 1 時間とっておく。allowQuery を空にして、クエリが違っても同じ結果を返す
// (クエリを変えて D1 を引かせられないように)
const isrHourly = { isr: { expiration: 3600, allowQuery: [] } }

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  runtimeConfig: {
    // API (/api/**) を、このアプリのサーバーからの呼び出しだけに限るための合言葉。
    // サーバー側にしか渡らない非公開の値。本番では NUXT_API_SECRET で指定し、
    // 指定がなければビルドごと (dev では起動ごと) にランダムな値にする
    apiSecret: randomUUID(),
    // 動画を置いている R2 のバケットと、読み出し用の API トークン (S3 互換のアクセスキー)。
    // 本番では NUXT_R2_ACCOUNT_ID・NUXT_R2_ACCESS_KEY_ID・NUXT_R2_SECRET_ACCESS_KEY で指定する
    r2: {
      accountId: '',
      accessKeyId: '',
      secretAccessKey: '',
      bucket: 'wotagei-battle-log',
    },
  },
  // イベント・プレイヤーの画面は、Vercel の ISR で描画結果を 1 時間とっておく。
  // 中身 (DB の値) は取り込み (db:import) のときにしか変わらないので、そのたびに API・D1 を引かなくてよい。
  // 期限を過ぎると、古い結果を返しながら裏で描き直す。404 もとっておかれる。
  // とっておいた結果はデプロイごとに別なので、取り込んだ内容をすぐ出したいときは再デプロイする。
  // 画面には署名付き URL を載せず /download/** へのリンクだけを置くので、とっておいても期限切れにならない。
  // /download/** (署名付き URL への転送) と /api/** は、ここに含めずリクエストのたびに動かす。
  routeRules: {
    '/:series/:event': isrHourly,
    '/:series/:event/players/:no': isrHourly,
  },
  experimental: {
    // ISR のルートがあると、Nuxt は画面のデータ (payload) を HTML から _payload.json に切り出し、ブラウザに取りに来させる。
    // _payload.json も別に ISR でとっておかれるので、描き直し (D1 を引く) が HTML と合わせて 2 倍になり、
    // ブラウザのリクエストも 1 本増える。HTML に埋め込んだままにする。
    // 画面どうしは <a> の通常の遷移でつないでいて、クライアント側の遷移で payload を使うこともない
    payloadExtraction: false,
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
