/**
 * URL のイベントの情報 (名前・開催日・運営の連絡先)。親ルート ([event].vue) と配下のページの両方で使う。
 * Nuxt の既定では、サーバーで描画するときは呼ぶたびに API を叩き直すので、
 * 同じ描画の中で取得済みなら、その結果を使い回す
 */
export function useEventInfo() {
  const { params } = useRoute()
  // URL を series と event に分けて書くと、API (server/api/[series]/[event]/) の戻り値の型が付く
  return useApiFetch(`/api/${params.series}/${params.event}`, {
    getCachedData: (key, nuxtApp, ctx) =>
      ctx.cause === 'initial' ? nuxtApp.payload.data[key] : undefined,
  })
}
