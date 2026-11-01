/**
 * API から取れたデータを返す。取れなければページのエラーにする。API の 404 はページの 404 にし、
 * それ以外 (DB につながらないなど) は 500 にする。
 * 画面は ISR でとっておくので、一時的な失敗を 404 や空の一覧として返すと、それが期限まで残ってしまう。
 * 500 なら Vercel はとっておかない
 */
export function requireApiData<T>(result: {
  data: Ref<T>
  error: Ref<{ status?: number } | null | undefined>
}): NonNullable<T> {
  const { data, error } = result
  if (!error.value && data.value != null) return data.value
  throw createError(
    error.value && error.value.status !== 404
      ? { status: 500, statusText: 'Internal Server Error', fatal: true }
      : { status: 404, statusText: 'Page Not Found', fatal: true },
  )
}
