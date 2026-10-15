import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn } from 'storybook/test'
import { ref, watch } from 'vue'
import BulkDownloadSheet from './BulkDownloadSheet.vue'

/**
 * 動画をまとめてダウンロードするときに、画面の下から出すシート。
 *
 * - `choose` で保存のしかた (ZIP / 1 本ずつ) を選び、選んだ値を `v-model:method` でやり取りする。開始ボタンで `start` を発火する
 * - `preparing` で準備の進み具合を示す。見出しと注意は保存のしかたによって変わる
 * - 閉じるボタン・キャンセルボタンは `close` を発火する。背面の暗い幕や開け閉めは、置く画面の側で受け持つ
 */
const meta = {
  component: BulkDownloadSheet,
  tags: ['autodocs'],
  args: {
    playerName: 'はやて',
    count: 6,
    totalSize: '4.2 GB',
    progress: 64,
    detail: '2.7 GB / 4.2 GB',
    method: 'zip',
    onClose: fn(),
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

/** ZIP を選んでいる。開始ボタンで `start` が、閉じるボタンで `close` が 1 回ずつ発火する。 */
export const ChooseZip: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'ダウンロードを開始' }),
    )
    await expect(args.onStart).toHaveBeenCalledOnce()
    await userEvent.click(canvas.getByRole('button', { name: '閉じる' }))
    await expect(args.onClose).toHaveBeenCalledOnce()
  },
}

/** 1 本ずつ保存するほうを選んでいる。 */
export const ChooseSeq: Story = {
  args: { method: 'seq' },
}

/** ZIP を作っている。キャンセルボタンで `close` が発火する。 */
export const PreparingZip: Story = {
  args: { step: 'preparing' },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'キャンセル' }))
    await expect(args.onClose).toHaveBeenCalledOnce()
  },
}

/** 1 本ずつ保存している。進み具合は本数で示す。 */
export const PreparingSeq: Story = {
  args: { step: 'preparing', method: 'seq', detail: '4 / 6 本' },
}
