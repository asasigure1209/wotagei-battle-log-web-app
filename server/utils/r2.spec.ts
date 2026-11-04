import { afterEach, describe, expect, it, vi } from 'vitest'
import { missingVideoProblems } from './admin-upload'
import {
  abortMultipartUpload,
  completeBody,
  completeMultipartUpload,
  createMultipartUpload,
  hasAllParts,
  isR2Configured,
  listObjects,
  listUploadedParts,
  parseObjects,
  parseParts,
  presignDownloadUrl,
  presignUploadPart,
  r2UploadConfig,
  xmlValues,
} from './r2'

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

describe('R2 の接続先と書き込み用の値', () => {
  it('endpoint を指定すると、R2 の代わりにその URL に送る (末尾の / は除く)', async () => {
    const url = new URL(
      await presignDownloadUrl(
        { ...config, endpoint: 'http://127.0.0.1:9100/' },
        's/e/a.mp4',
        'a.mp4',
      ),
    )
    expect(url.origin).toBe('http://127.0.0.1:9100')
    expect(url.pathname).toBe('/bucket/s/e/a.mp4')
  })

  it('r2UploadConfig は、アカウント・バケット・接続先は共通のまま、書き込み用のトークンを使う', () => {
    expect(
      r2UploadConfig({
        ...config,
        endpoint: 'http://local',
        uploadAccessKeyId: 'wkey',
        uploadSecretAccessKey: 'wsecret',
      }),
    ).toEqual({
      accountId: 'account',
      bucket: 'bucket',
      endpoint: 'http://local',
      accessKeyId: 'wkey',
      secretAccessKey: 'wsecret',
    })
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

/** fetch の偽物。R2 に送ったリクエスト (メソッド・URL・本文) を requests に残し、respond の返す本文を返す */
function stubR2(respond: (request: Request) => Response | string) {
  const requests: { method: string; url: URL; body: string }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (request: Request) => {
      requests.push({
        method: request.method,
        url: new URL(request.url),
        body: await request.text(),
      })
      const res = respond(request)
      return typeof res === 'string' ? new Response(res) : res
    }),
  )
  return requests
}

const partsXml = (nos: number[], next?: number) =>
  `<ListPartsResult><IsTruncated>${next ? 'true' : 'false'}</IsTruncated>${
    next ? `<NextPartNumberMarker>${next}</NextPartNumberMarker>` : ''
  }${nos.map((n) => `<Part><PartNumber>${n}</PartNumber><ETag>&quot;e${n}&quot;</ETag></Part>`).join('')}</ListPartsResult>`

describe('listObjects', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('続きがある間は continuation-token を付けて取り続ける', async () => {
    const requests = stubR2((request) =>
      new URL(request.url).searchParams.get('continuation-token')
        ? '<R><IsTruncated>false</IsTruncated><Contents><Key>s/e/b.mp4</Key><Size>2</Size></Contents></R>'
        : '<R><IsTruncated>true</IsTruncated><NextContinuationToken>t&amp;2</NextContinuationToken><Contents><Key>s/e/a.mp4</Key><Size>1</Size></Contents></R>',
    )
    expect(await listObjects(config, 's/e/')).toEqual([
      { key: 's/e/a.mp4', size: 1 },
      { key: 's/e/b.mp4', size: 2 },
    ])
    expect(requests.map((r) => r.url.searchParams.get('prefix'))).toEqual([
      's/e/',
      's/e/',
    ])
    expect(requests[1]?.url.searchParams.get('continuation-token')).toBe('t&2')
  })

  it('R2 がエラーを返したら例外にする', async () => {
    stubR2(() => new Response('<Error>AccessDenied</Error>', { status: 403 }))
    await expect(listObjects(config, 's/e/')).rejects.toThrow('403')
  })
})

describe('マルチパートアップロード', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('createMultipartUpload は ?uploads に POST し、UploadId を返す', async () => {
    const requests = stubR2(
      () =>
        '<InitiateMultipartUploadResult><UploadId>u&amp;1</UploadId></InitiateMultipartUploadResult>',
    )
    expect(await createMultipartUpload(config, 's/e/a.mp4')).toBe('u&1')
    expect(requests[0]?.method).toBe('POST')
    expect(requests[0]?.url.pathname).toBe('/bucket/s/e/a.mp4')
    expect(requests[0]?.url.search).toBe('?uploads')
  })

  it('createMultipartUpload は UploadId が返らなければ例外にする', async () => {
    stubR2(() => '<InitiateMultipartUploadResult />')
    await expect(createMultipartUpload(config, 's/e/a.mp4')).rejects.toThrow(
      'UploadId',
    )
  })

  it('listUploadedParts は、続きがある間は part-number-marker を付けて取り続ける', async () => {
    const requests = stubR2((request) =>
      new URL(request.url).searchParams.get('part-number-marker')
        ? partsXml([3])
        : partsXml([1, 2], 2),
    )
    expect(await listUploadedParts(config, 's/e/a.mp4', 'u1')).toEqual([
      { partNumber: 1, etag: '"e1"' },
      { partNumber: 2, etag: '"e2"' },
      { partNumber: 3, etag: '"e3"' },
    ])
    expect(
      requests.map((r) => r.url.searchParams.get('part-number-marker')),
    ).toEqual([null, '2'])
  })

  it('completeMultipartUpload は、R2 に届いたパートの ETag で完了させる', async () => {
    const requests = stubR2((request) =>
      request.method === 'GET'
        ? partsXml([2, 1])
        : '<CompleteMultipartUploadResult />',
    )
    await completeMultipartUpload(config, 's/e/a.mp4', 'u1', 2)
    const complete = requests.find((r) => r.method === 'POST')
    expect(complete?.url.searchParams.get('uploadId')).toBe('u1')
    expect(complete?.body).toBe(
      completeBody([
        { partNumber: 1, etag: '"e1"' },
        { partNumber: 2, etag: '"e2"' },
      ]),
    )
  })

  it('completeMultipartUpload は、パートが足りなければ完了させずに例外にする', async () => {
    const requests = stubR2(() => partsXml([1]))
    await expect(
      completeMultipartUpload(config, 's/e/a.mp4', 'u1', 2),
    ).rejects.toThrow('1 / 2')
    expect(requests.some((r) => r.method === 'POST')).toBe(false)
  })

  it('completeMultipartUpload は、200 のまま本文で Error が返ったら例外にする', async () => {
    stubR2((request) =>
      request.method === 'GET'
        ? partsXml([1])
        : '<Error><Code>InternalError</Code></Error>',
    )
    await expect(
      completeMultipartUpload(config, 's/e/a.mp4', 'u1', 1),
    ).rejects.toThrow('完了できませんでした')
  })

  it('abortMultipartUpload は uploadId を付けて DELETE する', async () => {
    const requests = stubR2(() => new Response(null, { status: 204 }))
    await abortMultipartUpload(config, 's/e/a.mp4', 'u1')
    expect(requests[0]?.method).toBe('DELETE')
    expect(requests[0]?.url.searchParams.get('uploadId')).toBe('u1')
  })
})

describe('missingVideoProblems', () => {
  it('R2 にない動画と、サイズが違う動画を挙げる', () => {
    expect(
      missingVideoProblems(
        [
          { key: 's/e/a.mp4', sizeBytes: 1 },
          { key: 's/e/b.mp4', sizeBytes: 2 },
          { key: 's/e/c.mp4', sizeBytes: 3 },
        ],
        [
          { key: 's/e/a.mp4', size: 1 },
          { key: 's/e/b.mp4', size: 5 },
        ],
      ),
    ).toEqual([
      'R2 の動画とサイズが違います (R2: 5, 登録: 2): s/e/b.mp4',
      'R2 にまだアップロードされていません: s/e/c.mp4',
    ])
  })
})
