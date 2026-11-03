// パートをブラウザから R2 に直接 PUT させる、署名付き URL を返す
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    key?: unknown
    uploadId?: unknown
    partNumber?: unknown
  }>(event)
  const url = await presignUploadPart(
    requireR2Upload(event),
    requireVideoKey(body?.key),
    requireUploadId(body?.uploadId),
    requirePositiveInt(body?.partNumber, 'partNumber'),
  )
  return { url }
})
