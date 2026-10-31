/**
 * プレイヤーの動画を 1 本保存することと、保存済みの記録。
 * playerPath はプレイヤー画面のパス (/<series>/<event>/players/<no>)
 */
export function useVideoDownload(playerPath: string) {
  // 保存を始めた動画。ブラウザが保存し終えたかは分からないので、始めた時点で保存済みにする
  const saved = ref<Record<string, boolean>>({})

  function download(video: { no: string }) {
    startDownload(videoDownloadPath(playerPath, video.no))
    saved.value[video.no] = true
  }

  return reactive({ saved, download })
}
