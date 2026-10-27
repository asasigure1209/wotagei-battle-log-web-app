/**
 * シリーズ ID・イベント ID の規則。動画をアップロードするとき (video_upload の mise upload) と同じく英数字と _ - だけ。
 * URL とオブジェクトキーの 1 階層になるので、取り込み (server/db/manifest.ts) とページ (app/pages/[series]/[event].vue) で同じものを使う
 */
export function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[\w-]+$/.test(value)
}
