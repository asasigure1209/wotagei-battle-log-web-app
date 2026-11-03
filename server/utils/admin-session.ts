// 管理画面 (/admin) の簡易的な認証。
// 合言葉 (runtimeConfig.adminPassword = NUXT_ADMIN_PASSWORD) を知っている人だけがログインでき、
// ログインすると「期限.署名」の Cookie を渡す。署名は合言葉を鍵にした HMAC なので、合言葉を変えると今までのログインはすべて切れる。
// 合言葉が設定されていなければ、だれもログインできない (管理画面は使えない)
import { createHmac } from 'node:crypto'
import { hasValidApiSecret } from './api-secret'

export const ADMIN_SESSION_COOKIE = 'wbl_admin_session'
/** ログインが続く時間 (秒) */
export const ADMIN_SESSION_TTL_SEC = 12 * 60 * 60

function sign(exp: number, password: string) {
  return createHmac('sha256', password)
    .update(`admin-session:${exp}`)
    .digest('base64url')
}

/** 合言葉が合っているか。合言葉が設定されていなければ常に false */
export function isValidAdminPassword(provided: unknown, password: string) {
  return typeof provided === 'string' && hasValidApiSecret(provided, password)
}

/** ログインの Cookie に入れる値 */
export function createAdminSession(password: string, nowMs = Date.now()) {
  const exp = Math.floor(nowMs / 1000) + ADMIN_SESSION_TTL_SEC
  return `${exp}.${sign(exp, password)}`
}

/** Cookie の値が、期限内で、いまの合言葉で署名したものか */
export function isValidAdminSession(
  token: string | undefined,
  password: string,
  nowMs = Date.now(),
) {
  if (!token || !password) return false
  const [expText = '', signature] = token.split('.')
  const exp = Number(expText)
  if (!/^\d+$/.test(expText) || exp * 1000 <= nowMs) return false
  return hasValidApiSecret(signature, sign(exp, password))
}

/** パスからクエリを除く */
function pathname(path: string) {
  return path.split('?')[0] ?? ''
}

/** 管理画面の API (ログインの API も含む) */
export function isAdminApiPath(path: string) {
  return pathname(path).startsWith('/api/admin/')
}

/** ログインの API。ここだけはログインせずに呼べる */
export function isAdminLoginPath(path: string) {
  return pathname(path) === '/api/admin/login'
}
