import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import AppProgressBar from './AppProgressBar.vue'

/**
 * ダウンロードの準備の進み具合を表す棒。
 *
 * - 詳細 (`detail`) には、ZIP なら容量、1 本ずつなら本数を入れる
 * - 読み上げ用の名前 (`label`) を必ず付ける
 */
const meta = {
  component: AppProgressBar,
  tags: ['autodocs'],
  args: {
    value: 64,
    detail: '2.7 GB / 4.2 GB',
    label: 'ダウンロードの進み具合',
  },
} satisfies Meta<typeof AppProgressBar>

export default meta
type Story = StoryObj<typeof meta>

/** ZIP を作っている途中。容量で進み具合を示す。読み上げにも同じ値が伝わる。 */
export const Bytes: Story = {
  play: async ({ canvas }) => {
    const bar = canvas.getByRole('progressbar', {
      name: 'ダウンロードの進み具合',
    })
    await expect(bar).toHaveAttribute('aria-valuenow', '64')
    await expect(canvas.getByText('64%')).toBeVisible()
  },
}

/** 1 本ずつ保存している途中。本数で進み具合を示す。 */
export const Count: Story = {
  args: { value: 18, detail: '1 / 6 本' },
}
