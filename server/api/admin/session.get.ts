// ログインしているか。ログインしていなければ middleware/admin-auth.ts が 401 を返す
export default defineEventHandler(() => ({ ok: true }))
