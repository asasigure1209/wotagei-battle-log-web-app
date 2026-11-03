import { describe, expect, it } from 'vitest'
import {
  ADMIN_SESSION_TTL_SEC,
  createAdminSession,
  isAdminApiPath,
  isAdminLoginPath,
  isValidAdminPassword,
  isValidAdminSession,
} from '~~/server/utils/admin-session'

const now = Date.UTC(2026, 0, 1)

describe('管理画面の合言葉', () => {
  it('設定した合言葉と同じ文字列だけを通す', () => {
    expect(isValidAdminPassword('pass', 'pass')).toBe(true)
    expect(isValidAdminPassword('Pass', 'pass')).toBe(false)
    expect(isValidAdminPassword(123, 'pass')).toBe(false)
  })

  it('合言葉が設定されていなければ、だれも通さない', () => {
    expect(isValidAdminPassword('', '')).toBe(false)
  })
})

describe('管理画面のログインの Cookie', () => {
  it('同じ合言葉で作った、期限内の値だけを通す', () => {
    const token = createAdminSession('pass', now)
    expect(isValidAdminSession(token, 'pass', now)).toBe(true)
    expect(isValidAdminSession(token, 'other', now)).toBe(false)
    expect(isValidAdminSession(token, '', now)).toBe(false)
    expect(isValidAdminSession(undefined, 'pass', now)).toBe(false)
  })

  it('期限を過ぎたら通さない', () => {
    const token = createAdminSession('pass', now)
    const later = now + ADMIN_SESSION_TTL_SEC * 1000
    expect(isValidAdminSession(token, 'pass', later - 1)).toBe(true)
    expect(isValidAdminSession(token, 'pass', later)).toBe(false)
  })

  it('期限を書き換えると署名が合わなくなる', () => {
    const [exp, signature] = createAdminSession('pass', now).split('.')
    const forged = `${Number(exp) + 3600}.${signature}`
    expect(isValidAdminSession(forged, 'pass', now)).toBe(false)
    expect(isValidAdminSession(`abc.${signature}`, 'pass', now)).toBe(false)
  })
})

describe('管理画面の API のパス', () => {
  it('/api/admin/ の下だけが管理画面の API', () => {
    expect(isAdminApiPath('/api/admin/events')).toBe(true)
    expect(isAdminApiPath('/api/admin/events?x=1')).toBe(true)
    expect(isAdminApiPath('/api/elnino/vol5')).toBe(false)
    expect(isAdminApiPath('/api/adminx/a')).toBe(false)
  })

  it('ログインの API はパスがちょうど同じときだけ (下の階層は含めない)', () => {
    expect(isAdminLoginPath('/api/admin/login')).toBe(true)
    expect(isAdminLoginPath('/api/admin/login?next=1')).toBe(true)
    expect(isAdminLoginPath('/api/admin/login/../events')).toBe(false)
    expect(isAdminLoginPath('/api/admin/logins')).toBe(false)
  })
})
