/**
 * 動画を選ぶモード。まとめてダウンロードする動画 (targets) は、
 * 選択モードでは選んだ動画だけ、そうでなければ全部になる
 */
export function useVideoSelection<T extends { no: string }>(
  videos: readonly T[],
) {
  const active = ref(false)
  const selected = ref<Record<string, boolean>>({})
  const targets = computed(() =>
    active.value ? videos.filter((v) => selected.value[v.no]) : videos,
  )

  /** 選択モードを切り替える。切り替えるたびに選んだ動画は空に戻す */
  function toggle() {
    active.value = !active.value
    selected.value = {}
  }

  return reactive({ active, selected, targets, toggle })
}
