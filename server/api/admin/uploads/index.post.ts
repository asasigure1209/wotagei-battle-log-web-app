// 動画のマルチパートアップロードを始める
export default defineEventHandler(async (event) => {
  const body = await readBody<{ key?: unknown }>(event)
  const key = requireVideoKey(body?.key)
  const uploadId = await createMultipartUpload(requireR2Upload(event), key)
  return { uploadId }
})
