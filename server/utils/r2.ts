// R2 に置いた動画を、ブラウザが直接取りに行くための署名付き URL を作る。
// R2 の S3 互換 API に、クエリに署名を載せた GET の URL を作るだけで、R2 には問い合わせない
import { AwsV4Signer } from 'aws4fetch'
import type { RuntimeConfig } from 'nuxt/schema'

/** R2 につなぐための値 (nuxt.config.ts の runtimeConfig.r2) */
export type R2Config = RuntimeConfig['r2']

/** 署名に要る値がそろっているか */
export function isR2Configured(config: R2Config) {
  return Boolean(
    config.accountId && config.accessKeyId && config.secretAccessKey,
  )
}

/**
 * storageKey の動画を fileName という名前で保存させる、expiresSec 秒だけ使える URL。
 * Content-Disposition を attachment にして、別オリジンの URL でもブラウザが再生せずに保存するようにする
 */
export async function presignDownloadUrl(
  config: R2Config,
  storageKey: string,
  fileName: string,
  expiresSec = 600,
) {
  // キーには日本語のディレクトリ名が入るので、/ で区切った 1 つずつをエンコードする
  const path = storageKey.split('/').map(encodeURIComponent).join('/')
  const url = new URL(
    `https://${config.accountId}.r2.cloudflarestorage.com/${config.bucket}/${path}`,
  )
  url.searchParams.set('X-Amz-Expires', String(expiresSec))
  url.searchParams.set(
    'response-content-disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  )
  const signer = new AwsV4Signer({
    url: url.toString(),
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: 's3',
    region: 'auto',
    signQuery: true,
  })
  return (await signer.sign()).url.toString()
}
