// 管理画面からログアウトする
export default defineEventHandler((event) => {
  deleteCookie(event, ADMIN_SESSION_COOKIE, { path: '/' })
  return { ok: true }
})
