// MP4 (ISO BMFF) の動画の長さを、ファイルの moov/mvhd ボックスから読む。
// video-uploader の mise manifest は ffprobe で調べていたが、ブラウザでは <video> で開くと
// 再生できない形式 (古いブラウザの HEVC など) で長さが取れないので、コーデックに関係なく読めるようボックスを直接読む。
// moov は動画の後ろに置かれることも多いので、ボックスの頭 (16 バイト) だけを読んで飛ばしながら探す

type Box = { type: string; start: number; end: number; headerSize: number }

/**
 * moov のうち、まず読む先頭の大きさ。moov には再生用の表が入っていて長い動画では数 MB になるが、
 * mvhd はほぼ必ず moov の最初の子なので、先頭だけで見つかる。見つからないときだけ moov を全部読む
 */
const MOOV_HEAD_BYTES = 64 * 1024

/** 長さ (秒、四捨五入)。MP4 として読めなければ null */
export async function readMp4Duration(file: Blob): Promise<number | null> {
  try {
    const moov = await findTopLevelBox(file, 'moov')
    if (!moov) return null
    const start = moov.start + moov.headerSize
    const headEnd = Math.min(moov.end, start + MOOV_HEAD_BYTES)
    const fromHead = await durationIn(file, start, headEnd)
    if (fromHead !== null || headEnd === moov.end) return fromHead
    return await durationIn(file, start, moov.end)
  } catch {
    return null
  }
}

/** file の start〜end (moov の中身) から mvhd を探して長さを出す */
async function durationIn(file: Blob, start: number, end: number) {
  const body = new DataView(await file.slice(start, end).arrayBuffer())
  const mvhd = findChildBox(body, 'mvhd')
  return mvhd ? mvhdDuration(body, mvhd) : null
}

async function findTopLevelBox(file: Blob, type: string) {
  let offset = 0
  while (offset + 8 <= file.size) {
    const head = new DataView(
      await file.slice(offset, offset + 16).arrayBuffer(),
    )
    const box = readBoxHeader(head, 0, offset, file.size)
    if (!box) return null
    if (box.type === type) return box
    offset = box.end
  }
  return null
}

function findChildBox(view: DataView, type: string) {
  let offset = 0
  while (offset + 8 <= view.byteLength) {
    const box = readBoxHeader(view, offset, offset, view.byteLength)
    if (!box) return null
    if (box.type === type) return box
    offset = box.end
  }
  return null
}

/**
 * view の at から始まるボックスの頭を読む。位置 (start・end) は base を起点にした値で返す。
 * size が 1 なら 64 ビットの大きさが続き、0 ならファイルの終わりまで
 */
function readBoxHeader(
  view: DataView,
  at: number,
  base: number,
  limit: number,
): Box | null {
  const size32 = view.getUint32(at)
  const type = String.fromCharCode(
    ...new Uint8Array(view.buffer, view.byteOffset + at + 4, 4),
  )
  const headerSize = size32 === 1 ? 16 : 8
  const size = boxSize(view, at, size32, limit - base)
  if (size < headerSize || base + size > limit) return null
  return { type, start: base, end: base + size, headerSize }
}

function boxSize(view: DataView, at: number, size32: number, rest: number) {
  if (size32 === 0) return rest
  if (size32 === 1) return Number(view.getBigUint64(at + 8))
  return size32
}

/** mvhd の timescale と duration から秒を出す (version 1 はそれぞれの時刻が 64 ビット) */
function mvhdDuration(view: DataView, mvhd: Box) {
  const at = mvhd.start + mvhd.headerSize
  const version = view.getUint8(at)
  const timescale = view.getUint32(at + (version === 1 ? 20 : 12))
  const duration =
    version === 1 ? Number(view.getBigUint64(at + 24)) : view.getUint32(at + 16)
  return timescale ? Math.round(duration / timescale) : null
}
