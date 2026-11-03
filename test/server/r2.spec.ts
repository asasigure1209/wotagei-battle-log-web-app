import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  completeBody,
  hasAllParts,
  isR2Configured,
  listObjects,
  parseObjects,
  parseParts,
  presignDownloadUrl,
  presignUploadPart,
  xmlValues,
} from '../../server/utils/r2'

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

describe('presignUploadPart', () => {
  it('パート番号と uploadId を付けた PUT の署名付き URL を作る', async () => {
    const url = new URL(
      await presignUploadPart(config, 's/e/予選/a.mp4', 'up+id', 3),
    )
    expect(url.pathname).toBe(`/bucket/s/e/${encodeURIComponent('予選')}/a.mp4`)
    expect(url.searchParams.get('partNumber')).toBe('3')
    expect(url.searchParams.get('uploadId')).toBe('up+id')
    expect(url.searchParams.get('X-Amz-Expires')).toBe('3600')
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('R2 の応答 (XML) の読み取り', () => {
  it('ListObjectsV2 のキーとサイズを読む (エスケープを戻す)', () => {
    const xml = `<ListBucketResult><IsTruncated>false</IsTruncated>
      <Contents><Key>s/e/A&amp;B.mp4</Key><Size>10</Size></Contents>
      <Contents><Key>s/e/予選/c.mp4</Key><Size>2000000000</Size></Contents>
    </ListBucketResult>`
    expect(parseObjects(xml)).toEqual([
      { key: 's/e/A&B.mp4', size: 10 },
      { key: 's/e/予選/c.mp4', size: 2_000_000_000 },
    ])
  })

  it('ListParts のパート番号と ETag を読む', () => {
    const xml = `<ListPartsResult>
      <Part><PartNumber>1</PartNumber><ETag>&quot;aaa&quot;</ETag><Size>5</Size></Part>
      <Part><PartNumber>2</PartNumber><ETag>&#34;bbb&#x22;</ETag><Size>5</Size></Part>
    </ListPartsResult>`
    expect(parseParts(xml)).toEqual([
      { partNumber: 1, etag: '"aaa"' },
      { partNumber: 2, etag: '"bbb"' },
    ])
  })

  it('完了させる本文は、パート番号の順に並べて ETag をエスケープする', () => {
    expect(
      completeBody([
        { partNumber: 2, etag: '"b"' },
        { partNumber: 1, etag: '"a"' },
      ]),
    ).toBe(
      '<CompleteMultipartUpload><Part><PartNumber>1</PartNumber><ETag>&quot;a&quot;</ETag></Part><Part><PartNumber>2</PartNumber><ETag>&quot;b&quot;</ETag></Part></CompleteMultipartUpload>',
    )
  })

  it('パート番号 1〜n がそろっているかを確かめる', () => {
    const parts = (...nos: number[]) =>
      nos.map((partNumber) => ({ partNumber, etag: '' }))
    expect(hasAllParts(parts(1, 2, 3), 3)).toBe(true)
    expect(hasAllParts(parts(1, 3), 3)).toBe(false)
    expect(hasAllParts(parts(1, 2, 4), 3)).toBe(false)
    expect(xmlValues('<A>1</A><A>2</A>', 'A')).toEqual(['1', '2'])
  })
})

describe('listObjects', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('続きがある間は continuation-token を付けて取り続ける', async () => {
    const urls: URL[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (request: Request) => {
        const url = new URL(request.url)
        urls.push(url)
        const first = !url.searchParams.get('continuation-token')
        return new Response(
          first
            ? '<R><IsTruncated>true</IsTruncated><NextContinuationToken>t&amp;2</NextContinuationToken><Contents><Key>s/e/a.mp4</Key><Size>1</Size></Contents></R>'
            : '<R><IsTruncated>false</IsTruncated><Contents><Key>s/e/b.mp4</Key><Size>2</Size></Contents></R>',
        )
      }),
    )
    expect(await listObjects(config, 's/e/')).toEqual([
      { key: 's/e/a.mp4', size: 1 },
      { key: 's/e/b.mp4', size: 2 },
    ])
    expect(urls.map((u) => u.searchParams.get('prefix'))).toEqual([
      's/e/',
      's/e/',
    ])
    expect(urls[1]?.searchParams.get('continuation-token')).toBe('t&2')
  })

  it('R2 がエラーを返したら例外にする', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('<Error>AccessDenied</Error>', { status: 403 }),
      ),
    )
    await expect(listObjects(config, 's/e/')).rejects.toThrow('403')
  })
})
