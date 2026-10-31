import { describe, expect, it } from 'vitest'
import { presignDownloadUrl } from '../../server/utils/r2'

const config = {
  accountId: 'account',
  accessKeyId: 'key',
  secretAccessKey: 'secret',
  bucket: 'bucket',
}

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
})
