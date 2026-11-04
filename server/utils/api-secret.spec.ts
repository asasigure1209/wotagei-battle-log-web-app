import { describe, expect, it } from 'vitest'
import { configSecret, hasValidApiSecret } from './api-secret'

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

describe('runtimeConfig の合言葉の読み取り', () => {
  it('数字だけの値は Nuxt が数値にして読むので、文字列に戻す', () => {
    expect(configSecret(12345678)).toBe('12345678')
    expect(hasValidApiSecret('12345678', configSecret(12345678))).toBe(true)
  })

  it('文字列はそのまま、未設定は空にする', () => {
    expect(configSecret('secret')).toBe('secret')
    expect(configSecret(undefined)).toBe('')
    expect(configSecret(null)).toBe('')
  })
})
