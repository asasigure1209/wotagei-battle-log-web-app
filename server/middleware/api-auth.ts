// API (/api/**) は、このアプリのサーバー (SSR) からの呼び出しだけを受け付ける。
// 合言葉 (runtimeConfig の apiSecret) をヘッダーに載せていないリクエストは 401 にする
export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return

  const provided = getRequestHeader(event, API_SECRET_HEADER)
  if (!hasValidApiSecret(provided, useRuntimeConfig(event).apiSecret)) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }
})
