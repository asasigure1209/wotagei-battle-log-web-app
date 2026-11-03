// マルチパートアップロードを完了させる (R2 に届いたパートを 1 つのオブジェクトにまとめる)
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    key?: unknown
    uploadId?: unknown
    partCount?: unknown
  }>(event)
  await completeMultipartUpload(
    requireR2Upload(useRuntimeConfig(event).r2),
    requireVideoKey(body?.key),
    requireUploadId(body?.uploadId),
    requirePositiveInt(body?.partCount, 'partCount'),
  )
  return { ok: true }
})
