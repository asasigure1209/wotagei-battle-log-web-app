/**
 * API の取得に失敗していたら、ページのエラーにする。API の 404 はページの 404 にし、
 * それ以外 (DB につながらないなど) は 500 にする。
 * 画面は ISR でとっておくので、一時的な失敗を 404 や空の一覧として返すと、それが期限まで残ってしまう。
 * 500 なら Vercel はとっておかない
 */
export function throwIfApiFailed(
  error: { status?: number } | null | undefined,
) {
  if (!error) return
  throw createError(
    error.status === 404
      ? { status: 404, statusText: 'Page Not Found', fatal: true }
      : { status: 500, statusText: 'Internal Server Error', fatal: true },
  )
}
