// 管理画面で入力した内容を、DB に取り込む manifest (server/db/manifest.ts) の形にする

/**
 * 1 行に 1 人の名前を書いた文を、書いた順の名前の並びにする (エントリー No. はこの順に 1 から付く)。
 * 前後の空白は除き、空行はとばす
 */
export function parseEntryNames(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/** エントリーを No. の順に並べ、名前を 1 行に 1 人ずつ書いた文にする (parseEntryNames で読み戻せる) */
export function formatEntryNames(entries: { entryNo: number; name: string }[]) {
  return [...entries]
    .sort((a, b) => a.entryNo - b.entryNo)
    .map((e) => e.name)
    .join('\n')
}

/**
 * エントリーの No. が 1 から抜けなく並んでいるか (並び順は問わない)。
 * parseEntryNames の書き方では No. が書いた順に 1 から付くので、そうでないエントリーは名前だけでは書き表せない
 */
export function isNumberedFromOne(entries: { entryNo: number }[]) {
  const nos = entries.map((e) => e.entryNo).sort((a, b) => a - b)
  return nos.every((no, i) => no === i + 1)
}

/** 「1: BLAZE」の形の行を、エントリー No. をキーにした名前にする。形の違う行は problems に入れる */
export function parseEntriesText(text: string) {
  const entries: Record<string, string> = {}
  const problems: string[] = []
  const lines = text.split('\n').map((line, i) => ({ line: line.trim(), i }))
  for (const { line, i } of lines.filter((l) => l.line)) {
    const problem = addEntry(entries, line, i + 1)
    if (problem) problems.push(problem)
  }
  return { entries, problems }
}

/** 1 行を entries に足す。足せなければ誤りの文を返す */
function addEntry(
  entries: Record<string, string>,
  line: string,
  lineNo: number,
) {
  const entry = parseEntryLine(line)
  if (!entry)
    return `${lineNo} 行目は「No.: 名前」の形で書いてください: ${line}`
  if (entry.no in entries) return `エントリー No. ${entry.no} が重なっています`
  entries[entry.no] = entry.name
  return null
}

/** 「1: BLAZE」「1 BLAZE」「1．BLAZE」を No. と名前に分ける。分けられなければ null */
function parseEntryLine(line: string) {
  const match = line.match(/^(\d+)\s*[:：.．、,\s]\s*(.+)$/)
  const [, no, name] = match ?? []
  return no && name ? { no: String(Number(no)), name: name.trim() } : null
}

/** エントリーの一覧を、parseEntriesText で読める文にする */
export function formatEntriesText(
  entries: { entryNo: number; name: string }[],
) {
  return entries.map((e) => `${e.entryNo}: ${e.name}`).join('\n')
}

/** 「1, 2」「1 2」「1、2」を No. の並びにする。数でないものが混ざれば null */
export function parsePerformers(text: string): number[] | null {
  const parts = text.split(/[\s,、，]+/).filter(Boolean)
  if (!parts.every((p) => /^\d+$/.test(p))) return null
  return parts.map(Number)
}

/**
 * 選んだファイルの、イベントの中での相対パス。フォルダごと選んだときは、選んだフォルダ (videos など) を除いた
 * パス (予選/M1256.mp4) にする。ファイルだけを選んだときは、分類 (category) があればその下に置く
 */
export function relPathOf(
  file: { name: string; webkitRelativePath?: string },
  category = '',
) {
  const fromFolder = file.webkitRelativePath?.split('/').slice(1).join('/')
  if (fromFolder) return fromFolder
  const dir = category.trim().replace(/^\/+|\/+$/g, '')
  return dir ? `${dir}/${file.name}` : file.name
}

/**
 * パスの順に並べる (LC_ALL=C の sort と同じく、文字コードの順に比べる)。
 * 並び順がイベントの中での動画の No. になり、No. はダウンロードの URL (/players/<エントリー No.>/<動画の No.>) に入る。
 * 以前のイベントは、動画アップロード用の mise タスク (いまは削除済み) が `find | sort` (LC_ALL=C) で並べて登録したので、
 * 自然順やロケールに沿った順に変えると、そのイベントを管理画面で入れ直したときに No. がずれ、共有された URL が壊れる
 */
export function compareRelPath(a: string, b: string) {
  if (a === b) return 0
  return a < b ? -1 : 1
}

/** 1234567890 → '1.23 GB' */
export function formatBytes(bytes: number) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000
    unit++
  }
  return `${unit ? value.toFixed(2) : value} ${units[unit]}`
}

/** 192 → '3:12' */
export function formatSeconds(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}
