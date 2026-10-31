import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn } from 'storybook/test'
import { ref, watch } from 'vue'
import BulkDownloadSheet from './BulkDownloadSheet.vue'

/**
 * 動画をまとめてダウンロードするときに、画面の下から出すシート。
 *
 * - `choose` で保存のしかた (ZIP / 1 本ずつ) を選び、選んだ値を `v-model:method` でやり取りする。開始ボタンで `start` を発火する。
 *   ZIP はまだ作っていないので選べない
 * - `preparing` で準備の進み具合を示す。見出しと注意は保存のしかたによって変わる
 * - `v-model:open` で開け閉めする。dialog の showModal で開くので、背面の暗い幕・フォーカスの移動・Esc で閉じる、はブラウザが受け持つ。
 *   閉じるボタン・キャンセルボタン・Esc で閉じると `update:open` に false を渡す
 */
const meta = {
  component: BulkDownloadSheet,
  tags: ['autodocs'],
  parameters: {
    // 開いたシートは画面の最前面に出て、docs ページに並べると重なるので、ストーリーごとに iframe に分ける
    docs: { story: { inline: false, height: '560px' } },
  },
  args: {
    open: true,
    playerName: 'はやて',
    count: 6,
    totalSize: '4.2 GB',
    progress: 64,
    detail: '2.7 GB / 4.2 GB',
    method: 'seq',
    'onUpdate:open': fn(),
    onStart: fn(),
    'onUpdate:method': fn(),
  },
  // 選ばれている保存のしかたはストーリーの中で持ち、親で v-model を使ったときと同じように動かす。
  // args に書き戻すと、play 関数の途中で Storybook が描画し直し、そのときに fn() の呼び出しの記録が消えてしまう
  render: (args) => ({
    components: { BulkDownloadSheet },
    setup() {
      const method = ref(args.method)
      // Controls で変えた値は反映する
      watch(
        () => args.method,
        (value) => {
          method.value = value
        },
      )
      return { args, method }
    },
    template: '<BulkDownloadSheet v-bind="args" v-model:method="method" />',
  }),
} satisfies Meta<typeof BulkDownloadSheet>

export default meta
type Story = StoryObj<typeof meta>

/**
 * 1 本ずつ保存するほうを選んでいる。ZIP は選べない。
 * 開始ボタンで `start` が、閉じるボタンで `update:open` が発火する。
 */
export const ChooseSeq: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(
      canvas.getByRole('radio', { name: /ZIPでまとめて保存/ }),
    ).toBeDisabled()
    await expect(
      canvas.getByRole('radio', { name: /1本ずつ続けて保存/ }),
    ).toBeChecked()

    await userEvent.click(
      canvas.getByRole('button', { name: 'ダウンロードを開始' }),
    )
    await expect(args.onStart).toHaveBeenCalledOnce()
    await userEvent.click(canvas.getByRole('button', { name: '閉じる' }))
    await expect(args['onUpdate:open']).toHaveBeenCalledExactlyOnceWith(false)
  },
}

/** ZIP を作っている。キャンセルボタンで `update:open` が発火する。 */
export const PreparingZip: Story = {
  args: { step: 'preparing', method: 'zip' },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'キャンセル' }))
    await expect(args['onUpdate:open']).toHaveBeenCalledExactlyOnceWith(false)
  },
}

/** 1 本ずつ保存している。進み具合は本数で示す。 */
export const PreparingSeq: Story = {
  args: { step: 'preparing', detail: '4 / 6 本' },
}
