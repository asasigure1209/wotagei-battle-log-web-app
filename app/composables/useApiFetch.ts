/**
 * API (/api/**) を呼ぶための useFetch。
 * API はサーバーからの呼び出しだけを受け付けるので、サーバーで描画するときだけ合言葉をヘッダーに載せる。
 * ブラウザ用のビルドからはこの分岐ごと消え、合言葉は届かない
 */
export const useApiFetch = createUseFetch(() => {
  const headers: Record<string, string> = import.meta.server
    ? { [API_SECRET_HEADER]: useRuntimeConfig().apiSecret }
    : {}
  return { headers }
})
