/**
 * API を呼ぶときに付けるヘッダー。
 * API はサーバーからの呼び出しだけを受け付けるので、合言葉はサーバーで描画するときだけ載せる。
 * ブラウザ用のビルドからはこの分岐ごと消え、合言葉は届かない
 */
export function apiHeaders(): Record<string, string> {
  if (import.meta.server) {
    return { [API_SECRET_HEADER]: useRuntimeConfig().apiSecret }
  }
  return {}
}
