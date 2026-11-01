import { describe, expect, it } from 'vitest'
import { isR2Configured, presignDownloadUrl } from '../../server/utils/r2'

const config = {
  accountId: 'account',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  bucket: 'bucket',
}

describe('isR2Configured', () => {
  it('アカウント ID・アクセスキー・シークレットがそろっていれば true', () => {
    expect(isR2Configured(config)).toBe(true)
  })

  it('署名に要る値が 1 つでも空なら false', () => {
    for (const key of [
      'accountId',
      'accessKeyId',
      'secretAccessKey',
    ] as const) {
      expect(isR2Configured({ ...config, [key]: '' })).toBe(false)
    }
  })
})

describe('presignDownloadUrl', () => {
  it('R2 の S3 互換 API の、キーをエンコードした URL に署名を載せる', async () => {
    const url = new URL(
      await presignDownloadUrl(config, 's/e/予選/M1256.mp4', 'M1256.mp4'),
    )
    expect(url.origin).toBe('https://account.r2.cloudflarestorage.com')
    expect(url.pathname).toBe(
      `/bucket/s/e/${encodeURIComponent('予選')}/M1256.mp4`,
    )
    expect(url.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256')
    expect(url.searchParams.get('X-Amz-Credential')).toMatch(
      /^key\/\d{8}\/auto\/s3\/aws4_request$/,
    )
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('期限と、ファイル名を付けて保存させる指定を入れる', async () => {
    const url = new URL(
      await presignDownloadUrl(config, 's/e/a.mp4', '決勝.mp4', 60),
    )
    expect(url.searchParams.get('X-Amz-Expires')).toBe('60')
    expect(url.searchParams.get('response-content-disposition')).toBe(
      `attachment; filename*=UTF-8''${encodeURIComponent('決勝.mp4')}`,
    )
  })

  it('期限を指定しなければ 600 秒にする', async () => {
    const url = new URL(await presignDownloadUrl(config, 'a.mp4', 'a.mp4'))
    expect(url.searchParams.get('X-Amz-Expires')).toBe('600')
  })
})
