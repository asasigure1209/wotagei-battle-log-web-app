import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppIcon from './AppIcon.vue'

/**
 * 線で描くアイコン。
 *
 * - 色は親の文字色 (`currentColor`) を使う
 * - 飾りとして読み上げからは隠している。意味を伝えたいときは、隣に文字を置くかボタンにラベルを付ける
 */
const meta = {
  component: AppIcon,
  tags: ['autodocs'],
  args: { name: 'download' },
} satisfies Meta<typeof AppIcon>

export default meta
type Story = StoryObj<typeof meta>

/** ダウンロード。 */
export const Download: Story = {}

/** 一覧の行の右端に置き、タップで先に進めることを表す。 */
export const Chevron: Story = {
  args: { name: 'chevron' },
}

/** 前の画面に戻る。 */
export const Back: Story = {
  args: { name: 'back' },
}

/** シートなどを閉じる。 */
export const Close: Story = {
  args: { name: 'close' },
}

/** 保存済みなど、済んだことを表す。 */
export const Check: Story = {
  args: { name: 'check' },
}

/** Wi-Fi。容量が大きいことの注意に添える。 */
export const Wifi: Story = {
  args: { name: 'wifi' },
}
