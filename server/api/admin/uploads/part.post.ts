// パートをブラウザから R2 に直接 PUT させる、署名付き URL を返す。
// 署名は R2 に問い合わせずに作れるので、パートごとに呼ばせず、まとめて (partNumbers) 返す
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    key?: unknown
    uploadId?: unknown
    partNumbers?: unknown
  }>(event)
  const config = requireR2Upload(event)
  const key = requireVideoKey(body?.key)
  const uploadId = requireUploadId(body?.uploadId)
  const partNumbers = requirePartNumbers(body?.partNumbers)
  const urls = await Promise.all(
    partNumbers.map((n) => presignUploadPart(config, key, uploadId, n)),
  )
  return { urls }
})
