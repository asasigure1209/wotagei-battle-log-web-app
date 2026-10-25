import { describe, expect, it } from 'vitest'
import { hasValidApiSecret } from '~~/server/utils/api-secret'

describe('API の合言葉の確認', () => {
  it('runtimeConfig の apiSecret と同じ値だけを通す', () => {
    expect(hasValidApiSecret('secret', 'secret')).toBe(true)
    expect(hasValidApiSecret('secreT', 'secret')).toBe(false)
    expect(hasValidApiSecret('secret-longer', 'secret')).toBe(false)
  })

  it('合言葉がない、または apiSecret が空なら通さない', () => {
    expect(hasValidApiSecret(undefined, 'secret')).toBe(false)
    expect(hasValidApiSecret('', '')).toBe(false)
  })
})
