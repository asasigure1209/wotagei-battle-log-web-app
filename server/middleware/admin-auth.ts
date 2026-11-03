// 管理画面の API (/api/admin/**) は、ログイン (server/api/admin/login.post.ts) した人だけが使える。
// ログインの Cookie がない、期限切れ、合言葉が変わったあとのものは 401 にする
export default defineEventHandler((event) => {
  if (!isAdminApiPath(event.path) || isAdminLoginPath(event.path)) return

  const { adminPassword } = useRuntimeConfig(event)
  const token = getCookie(event, ADMIN_SESSION_COOKIE)
  if (!isValidAdminSession(token, adminPassword)) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }
})
