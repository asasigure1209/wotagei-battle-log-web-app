// R2 (S3 互換 API) とのやりとり。
// - ダウンロード: ブラウザが直接取りに行くための署名付き URL を作るだけで、R2 には問い合わせない
// - アップロード (管理画面): 動画は大きく、Vercel の関数はリクエストの本文を 4.5MB までしか受けられないので、
//   ブラウザから R2 にマルチパートアップロードで直接送らせる。サーバーは開始・パートごとの署名付き URL・完了だけを受け持つ
import { AwsClient, AwsV4Signer } from 'aws4fetch'
import type { RuntimeConfig } from 'nuxt/schema'

/** R2 につなぐための値 (nuxt.config.ts の runtimeConfig.r2 のうち、1 つの API トークンで使う分) */
export type R2Config = Pick<
  RuntimeConfig['r2'],
  'accountId' | 'accessKeyId' | 'secretAccessKey' | 'bucket'
> & {
  /** R2 の代わりに使う S3 互換の API の URL (ローカルで rclone serve s3 などを使って試すとき)。ふだんは空 */
  endpoint?: string
}

/** 署名に要る値がそろっているか */
export function isR2Configured(config: R2Config) {
  return Boolean(
    config.accountId && config.accessKeyId && config.secretAccessKey,
  )
}

/**
 * アップロード (書き込み) に使う R2 の値。ダウンロード用のトークンは読み出しだけに絞っているので、
 * 書き込みには別のトークン (runtimeConfig.r2.uploadAccessKeyId / uploadSecretAccessKey) を使う
 */
export function r2UploadConfig(r2: RuntimeConfig['r2']): R2Config {
  return {
    accountId: r2.accountId,
    bucket: r2.bucket,
    endpoint: r2.endpoint,
    accessKeyId: r2.uploadAccessKeyId,
    secretAccessKey: r2.uploadSecretAccessKey,
  }
}

/** キーのオブジェクトの URL。キーには日本語のディレクトリ名が入るので、/ で区切った 1 つずつをエンコードする */
function objectUrl(config: R2Config, storageKey: string) {
  const path = storageKey.split('/').map(encodeURIComponent).join('/')
  return new URL(`${bucketUrl(config)}/${path}`)
}

function bucketUrl(config: R2Config) {
  const origin =
    config.endpoint?.replace(/\/+$/, '') ||
    `https://${config.accountId}.r2.cloudflarestorage.com`
  return new URL(`${origin}/${config.bucket}`)
}

/** url に method で送る、expiresSec 秒だけ使える署名付き URL */
async function presign(
  config: R2Config,
  url: URL,
  method: string,
  expiresSec: number,
) {
  url.searchParams.set('X-Amz-Expires', String(expiresSec))
  const signer = new AwsV4Signer({
    method,
    url: url.toString(),
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: 'auto',
    signQuery: true,
  })
  return (await signer.sign()).url.toString()
}

/**
 * storageKey の動画を fileName という名前で保存させる、expiresSec 秒だけ使える URL。
 * Content-Disposition を attachment にして、別オリジンの URL でもブラウザが再生せずに保存するようにする
 */
export function presignDownloadUrl(
  config: R2Config,
  storageKey: string,
  fileName: string,
  expiresSec = 600,
) {
  const url = objectUrl(config, storageKey)
  url.searchParams.set(
    'response-content-disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  )
  return presign(config, url, 'GET', expiresSec)
}

/** R2 にリクエストを送る。エラーなら本文ごと例外にする */
async function r2Fetch(config: R2Config, url: URL, init: RequestInit = {}) {
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: 'auto',
    retries: 2,
  })
  const res = await client.fetch(url.toString(), init)
  const text = await res.text()
  // CompleteMultipartUpload は 200 のまま本文で Error を返すことがある
  if (!res.ok || text.includes('<Error>')) {
    throw new Error(`R2 がエラーを返しました (${res.status}): ${text}`)
  }
  return text
}

/** マルチパートアップロードを始め、UploadId を返す */
export async function createMultipartUpload(
  config: R2Config,
  storageKey: string,
  contentType = 'video/mp4',
) {
  const url = objectUrl(config, storageKey)
  url.search = 'uploads'
  const xml = await r2Fetch(config, url, {
    method: 'POST',
    headers: { 'content-type': contentType },
  })
  const [uploadId] = xmlValues(xml, 'UploadId')
  if (!uploadId) throw new Error(`R2 が UploadId を返しませんでした: ${xml}`)
  return uploadId
}

/** パート (partNumber は 1 から) をブラウザから PUT させる署名付き URL */
export function presignUploadPart(
  config: R2Config,
  storageKey: string,
  uploadId: string,
  partNumber: number,
  expiresSec = 3600,
) {
  const url = objectUrl(config, storageKey)
  url.searchParams.set('partNumber', String(partNumber))
  url.searchParams.set('uploadId', uploadId)
  return presign(config, url, 'PUT', expiresSec)
}

export type UploadedPart = { partNumber: number; etag: string }

/**
 * R2 が受け取ったパートの一覧。ブラウザが R2 の応答の ETag を読むには CORS で ETag を見せる設定が要るので、
 * 完了させるときは ETag をブラウザから受け取らず、R2 に問い合わせて使う
 */
export function listUploadedParts(
  config: R2Config,
  storageKey: string,
  uploadId: string,
) {
  return collectPages(async (marker) => {
    const url = objectUrl(config, storageKey)
    url.searchParams.set('uploadId', uploadId)
    if (marker) url.searchParams.set('part-number-marker', marker)
    const xml = await r2Fetch(config, url)
    return {
      items: parseParts(xml),
      next: nextMarker(xml, 'NextPartNumberMarker'),
    }
  })
}

/**
 * マルチパートアップロードを完了させる。R2 が受け取ったパートが partCount 個そろっていなければ、
 * 欠けたまま 1 つのオブジェクトにしないよう例外にする
 */
export async function completeMultipartUpload(
  config: R2Config,
  storageKey: string,
  uploadId: string,
  partCount: number,
) {
  const parts = await listUploadedParts(config, storageKey, uploadId)
  if (!hasAllParts(parts, partCount)) {
    throw new Error(
      `R2 に届いたパートが足りません (${parts.length} / ${partCount})`,
    )
  }
  const url = objectUrl(config, storageKey)
  url.searchParams.set('uploadId', uploadId)
  await r2Fetch(config, url, {
    method: 'POST',
    headers: { 'content-type': 'application/xml' },
    body: completeBody(parts),
  })
}

/** マルチパートアップロードを取りやめ、R2 に届いたパートを捨てる */
export async function abortMultipartUpload(
  config: R2Config,
  storageKey: string,
  uploadId: string,
) {
  const url = objectUrl(config, storageKey)
  url.searchParams.set('uploadId', uploadId)
  await r2Fetch(config, url, { method: 'DELETE' })
}

export type R2Object = { key: string; size: number }

/** prefix で始まるオブジェクトのキーとサイズ */
export function listObjects(config: R2Config, prefix: string) {
  return collectPages(async (token) => {
    const url = bucketUrl(config)
    url.searchParams.set('list-type', '2')
    url.searchParams.set('prefix', prefix)
    if (token) url.searchParams.set('continuation-token', token)
    const xml = await r2Fetch(config, url)
    return {
      items: parseObjects(xml),
      next: nextMarker(xml, 'NextContinuationToken'),
    }
  })
}

/** 一覧を、続きの目印 (next) がなくなるまで取り続ける */
async function collectPages<T>(
  fetchPage: (marker: string) => Promise<{ items: T[]; next: string }>,
) {
  const items: T[] = []
  let marker = ''
  do {
    const page = await fetchPage(marker)
    items.push(...page.items)
    marker = page.next
  } while (marker)
  return items
}

/** 一覧に続きがあれば、続きを取るための目印 (tag の値)。なければ空 */
function nextMarker(xml: string, tag: string) {
  const truncated = xmlValues(xml, 'IsTruncated')[0] === 'true'
  return truncated ? (xmlValues(xml, tag)[0] ?? '') : ''
}

/** パート番号 1〜partCount がそろっているか */
export function hasAllParts(parts: UploadedPart[], partCount: number) {
  const numbers = new Set(parts.map((p) => p.partNumber))
  return (
    numbers.size === partCount &&
    Array.from({ length: partCount }, (_, i) => i + 1).every((n) =>
      numbers.has(n),
    )
  )
}

export function completeBody(parts: UploadedPart[]) {
  const items = [...parts]
    .sort((a, b) => a.partNumber - b.partNumber)
    .map(
      (p) =>
        `<Part><PartNumber>${p.partNumber}</PartNumber><ETag>${escapeXml(p.etag)}</ETag></Part>`,
    )
  return `<CompleteMultipartUpload>${items.join('')}</CompleteMultipartUpload>`
}

export function parseParts(xml: string): UploadedPart[] {
  return xmlValues(xml, 'Part', false).map((part) => ({
    partNumber: Number(xmlValues(part, 'PartNumber')[0]),
    etag: xmlValues(part, 'ETag')[0] ?? '',
  }))
}

export function parseObjects(xml: string): R2Object[] {
  return xmlValues(xml, 'Contents', false).map((item) => ({
    key: xmlValues(item, 'Key')[0] ?? '',
    size: Number(xmlValues(item, 'Size')[0]),
  }))
}

/** XML の tag の中身を、出てくる順に取り出す。S3 の応答は入れ子が浅く決まった形なので、正規表現で足りる */
export function xmlValues(xml: string, tag: string, decode = true) {
  const pattern = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g')
  return Array.from(xml.matchAll(pattern), (m) =>
    decode ? unescapeXml(m[1] ?? '') : (m[1] ?? ''),
  )
}

const xmlEntities: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
}

/** XML の文字参照を戻す。名前 (&quot;) と数値 (&#34; &#x22;) のどちらで書かれていても読む */
function unescapeXml(text: string) {
  return text.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (e) =>
    e[1] === '#'
      ? String.fromCodePoint(Number(`0${e.slice(2, -1)}`))
      : (xmlEntities[e] ?? e),
  )
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
