import type { Method } from '~/components/MethodOption.vue'

/**
 * まとめてダウンロードするシートの状態と、続けて保存する処理。
 * targets は保存する動画の一覧を返す関数、downloadOne は 1 本保存する関数
 */
export function useBulkDownload<T>(
  targets: () => readonly T[],
  downloadOne: (item: T) => void,
) {
  const open = ref(false)
  const step = ref<'choose' | 'preparing'>('choose')
  const method = ref<Method>('seq')
  // ZIP はまだ作っていないので選べなくしておく
  const disabledMethods: Method[] = ['zip']

  // 続けて保存している本数と、保存を始めた本数
  const total = ref(0)
  const done = ref(0)
  const progress = computed(() =>
    total.value ? Math.round((done.value / total.value) * 100) : 0,
  )
  const detail = computed(() => `${done.value} / ${total.value} 本`)

  let abort: AbortController | undefined
  // キャンセルボタンや Esc でシートを閉じたり、画面を離れたりしたら、続けて保存するのをやめる
  watch(open, (o) => {
    if (!o) abort?.abort()
  })
  onBeforeUnmount(() => abort?.abort())

  /** シートを、保存のしかたを選ぶ段階で開く */
  function show() {
    step.value = 'choose'
    open.value = true
  }

  /** 1 本ずつ続けて保存する。保存し終えたらシートを閉じる */
  async function start() {
    const items = targets()
    step.value = 'preparing'
    total.value = items.length
    done.value = 0
    abort = new AbortController()
    const { signal } = abort
    await downloadInSequence(
      items,
      (item, i) => {
        downloadOne(item)
        done.value = i + 1
      },
      signal,
    )
    if (!signal.aborted) open.value = false
  }

  return reactive({
    open,
    step,
    method,
    disabledMethods,
    progress,
    detail,
    show,
    start,
  })
}
