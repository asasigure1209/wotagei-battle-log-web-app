import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn } from 'storybook/test'
import AppButton from './AppButton.vue'

/**
 * アプリ全体で使う汎用ボタン。
 *
 * - 主要な操作 (ダウンロードの開始など) には `primary`、それ以外 (キャンセルなど) には `secondary` を使う
 * - 画面下の大きな操作には `L`、一覧の見出しの横に置く小さな操作には `S` を使う
 * - 押せない状態は `disabled` で表し、そのときは `click` を発火しない
 */
const meta = {
  component: AppButton,
  tags: ['autodocs'],
  args: { label: 'ダウンロード', onClick: fn() },
} satisfies Meta<typeof AppButton>

export default meta
type Story = StoryObj<typeof meta>

/** 画面下に置く主要な操作。アイコンと補足を添え、幅いっぱいに広げる。押すと `click` が 1 回発火する。 */
export const Primary: Story = {
  args: {
    label: 'すべてダウンロード',
    size: 'L',
    icon: 'download',
    meta: '6本 · 4.2 GB',
    full: true,
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /すべてダウンロード/ }),
    )
    await expect(args.onClick).toHaveBeenCalledOnce()
  },
}

/** 標準の大きさの主要な操作。 */
export const PrimaryMedium: Story = {}

/** 押せない状態。押しても `click` は発火しない。 */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button'))
    await expect(args.onClick).not.toHaveBeenCalled()
  },
}

/** 補助的な操作に使う枠線のボタン。 */
export const Secondary: Story = {
  args: { label: 'キャンセル', variant: 'secondary', size: 'L', full: true },
}

/** 一覧の見出しの横に置く小さな操作。 */
export const SecondarySmall: Story = {
  args: { label: '選択', variant: 'secondary', size: 'S' },
}
