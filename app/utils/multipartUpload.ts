// 管理画面から、動画を R2 にマルチパートアップロードで直接送る。
// サーバー (/api/admin/uploads/**) には開始・パートごとの署名付き URL・完了だけを頼み、動画の中身はサーバーを通さない。
// R2 はマルチパートの最後以外のパートを同じ大きさにする必要があるので、決まった大きさで切る

/** 1 パートの大きさ。R2 の下限 (5 MiB) より大きく、パートの数の上限 (10000) でも 300 GB 超まで送れる */
export const PART_SIZE = 32 * 1024 * 1024
/** 同時に送るパートの数 */
const CONCURRENCY = 4
/** 1 パートを送り直す回数 */
const RETRIES = 3
/** 1 度に署名を頼むパートの数 (API の上限) */
const SIGN_BATCH = 1000

export type UploadDeps = {
  /** 管理画面の API に JSON を POST する */
  post<T>(path: string, body: Record<string, unknown>): Promise<T>
  /** 署名付き URL に blob を PUT する。送れたバイト数を onProgress で知らせる */
  put(
    url: string,
    blob: Blob,
    onProgress: (loaded: number) => void,
    signal?: AbortSignal,
  ): Promise<void>
}

export function partCountOf(size: number) {
  return Math.max(1, Math.ceil(size / PART_SIZE))
}

/** file を key にアップロードする。onProgress には送れたバイト数の合計を渡す */
export async function uploadMultipart(
  file: Blob,
  key: string,
  onProgress: (loaded: number) => void,
  deps: UploadDeps,
  signal?: AbortSignal,
) {
  const { uploadId } = await deps.post<{ uploadId: string }>(
    '/api/admin/uploads',
    { key },
  )
  const partCount = partCountOf(file.size)
  const loaded = new Array<number>(partCount).fill(0)
  let total = 0
  const report = (index: number, bytes: number) => {
    total += bytes - (loaded[index] ?? 0)
    loaded[index] = bytes
    onProgress(total)
  }
  try {
    const numbers = Array.from({ length: partCount }, (_, i) => i + 1)
    const urls = await signParts(deps, key, uploadId, numbers)
    await runPool(partCount, CONCURRENCY, (index) =>
      sendPart(
        { file, key, uploadId, index, url: urls[index] ?? '', deps, signal },
        (bytes) => report(index, bytes),
      ),
    )
    await deps.post('/api/admin/uploads/complete', { key, uploadId, partCount })
  } catch (error) {
    // 届いたパートが R2 に残らないよう取りやめる。取りやめに失敗しても、元のエラーを伝える
    await deps
      .post('/api/admin/uploads/abort', { key, uploadId })
      .catch(() => {})
    throw error
  }
}

/** パートの署名付き URL をまとめて取る (API は 1 度に 1000 個まで) */
async function signParts(
  deps: UploadDeps,
  key: string,
  uploadId: string,
  partNumbers: number[],
) {
  const urls: string[] = []
  for (let i = 0; i < partNumbers.length; i += SIGN_BATCH) {
    const res = await deps.post<{ urls: string[] }>('/api/admin/uploads/part', {
      key,
      uploadId,
      partNumbers: partNumbers.slice(i, i + SIGN_BATCH),
    })
    urls.push(...res.urls)
  }
  return urls
}

type PartJob = {
  file: Blob
  key: string
  uploadId: string
  index: number
  /** 最初に送るときに使う署名付き URL */
  url: string
  deps: UploadDeps
  signal?: AbortSignal
}

async function sendPart(job: PartJob, onProgress: (loaded: number) => void) {
  let lastError: unknown
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    const result = await tryPart(job, onProgress, attempt)
    if (result.ok) return
    onProgress(0)
    lastError = result.error
    if (job.signal?.aborted) break
  }
  throw lastError
}

/** パートを 1 回送ってみる */
async function tryPart(
  job: PartJob,
  onProgress: (loaded: number) => void,
  attempt: number,
) {
  const { file, index, deps } = job
  const blob = file.slice(index * PART_SIZE, (index + 1) * PART_SIZE)
  try {
    // 署名付き URL には期限があるので、送り直すときは取り直す
    const [url] =
      attempt === 1
        ? [job.url]
        : await signParts(deps, job.key, job.uploadId, [index + 1])
    await deps.put(url ?? '', blob, onProgress, job.signal)
    return { ok: true } as const
  } catch (error) {
    return { ok: false, error } as const
  }
}

/** 0〜count-1 を、同時に concurrency 個まで task に渡す。1 つでも失敗したら、残りを始めずに失敗する */
export async function runPool(
  count: number,
  concurrency: number,
  task: (index: number) => Promise<void>,
) {
  const pool = { next: 0, failed: false }
  const workers = Array.from({ length: Math.min(concurrency, count) }, () =>
    poolWorker(pool, count, task),
  )
  await Promise.all(workers)
}

async function poolWorker(
  pool: { next: number; failed: boolean },
  count: number,
  task: (index: number) => Promise<void>,
) {
  while (pool.next < count && !pool.failed) {
    const index = pool.next++
    await task(index).catch((error) => {
      pool.failed = true
      throw error
    })
  }
}

/** ブラウザで blob を PUT する。fetch では送信の進み具合が取れないので XMLHttpRequest を使う */
export function putWithXhr(
  url: string,
  blob: Blob,
  onProgress: (loaded: number) => void,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.upload.onprogress = (e) => onProgress(e.loaded)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(blob.size)
        resolve()
      } else {
        reject(new Error(`R2 への送信に失敗しました (${xhr.status})`))
      }
    }
    xhr.onerror = () =>
      reject(
        new Error(
          'R2 に送れませんでした (ネットワークか、R2 のバケットの CORS の設定を確かめてください)',
        ),
      )
    xhr.onabort = () => reject(new DOMException('中止しました', 'AbortError'))
    // アップロード全体で 1 つの signal を使い回すので、終わった XHR の listener を残さない
    const abort = () => xhr.abort()
    signal?.addEventListener('abort', abort, { once: true })
    xhr.onloadend = () => signal?.removeEventListener('abort', abort)
    xhr.send(blob)
  })
}
