import { timingSafeEqual } from 'node:crypto'

/** リクエストの合言葉が、runtimeConfig の apiSecret と一致するか */
export function hasValidApiSecret(
  provided: string | undefined,
  secret: string,
) {
  if (!provided || !secret) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  // 長さが違うと timingSafeEqual が例外を投げるので先に比べる
  return a.length === b.length && timingSafeEqual(a, b)
}
