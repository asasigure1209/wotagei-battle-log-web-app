// マルチパートアップロードを取りやめる (届いたパートを捨てる)
export default defineEventHandler(async (event) => {
  const body = await readBody<{ key?: unknown; uploadId?: unknown }>(event)
  await abortMultipartUpload(
    requireR2Upload(useRuntimeConfig(event).r2),
    requireVideoKey(body?.key),
    requireUploadId(body?.uploadId),
  )
  return { ok: true }
})
