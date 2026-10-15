import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn } from 'storybook/test'
import AppIconButton from './AppIconButton.vue'

/**
 * アイコンだけのボタン。
 *
 * - 画面に文字がないので、`label` に読み上げ用の名前を必ず付ける
 * - 一覧の行の中など単独で目立たせたいときは `outline`、シートの隅などに控えめに置くときは `ghost` を使う
 */
const meta = {
  component: AppIconButton,
  tags: ['autodocs'],
  args: { icon: 'download', label: 'ダウンロード', onClick: fn() },
} satisfies Meta<typeof AppIconButton>

export default meta
type Story = StoryObj<typeof meta>

/** 枠付きのボタン。押すと `click` が 1 回発火する。 */
export const Download: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'ダウンロード' }))
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
}

/** シートを閉じる控えめなボタン。 */
export const Close: Story = {
  args: { icon: 'close', variant: 'ghost', label: '閉じる' },
}

/** 前の画面に戻る控えめなボタン。 */
export const Back: Story = {
  args: { icon: 'back', variant: 'ghost', label: '戻る' },
}
