import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn } from 'storybook/test'
import AppButton from './AppButton.vue'

/**
 * アプリ全体で使う汎用ボタン。
 *
 * - 主要な操作 (記録の保存など) には `primary`、それ以外には `secondary` を使う
 * - 押せない状態は `disabled` で表し、そのときは `click` を発火しない
 */
const meta = {
  component: AppButton,
  tags: ['autodocs'],
  args: { label: 'ボタン', onClick: fn() },
} satisfies Meta<typeof AppButton>

export default meta
type Story = StoryObj<typeof meta>

/** 主要な操作に使う塗りつぶしのボタン。押すと `click` が 1 回発火する。 */
export const Primary: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'ボタン' }))
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
}

/** 補助的な操作に使う枠線のボタン。 */
export const Secondary: Story = {
  args: { variant: 'secondary' },
}

/** 押せない状態。押しても `click` は発火しない。 */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button'))
    await expect(args.onClick).not.toHaveBeenCalled()
  },
}
