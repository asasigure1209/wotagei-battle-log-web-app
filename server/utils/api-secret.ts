import { timingSafeEqual } from 'node:crypto'

/**
 * runtimeConfig の合言葉 (apiSecret・adminPassword) を文字列にする。
 * Nuxt は環境変数の値を型に直して読むので、NUXT_ADMIN_PASSWORD=12345678 のような数字だけの値は数値になる。
 * そのまま比べたり HMAC の鍵にしたりすると例外になるので、読んだところで文字列にそろえる。未設定なら空
 */
export function configSecret(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}

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
