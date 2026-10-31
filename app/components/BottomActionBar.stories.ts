import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn } from 'storybook/test'
import BottomActionBar from './BottomActionBar.vue'

/**
 * プレイヤーの動画一覧ページの下に固定するバー。
 *
 * - 通常 (`all`) は、すべての動画をダウンロードするボタンを出す
 * - 選択モード (`selection`) は、選んだ動画の本数・容量とダウンロードボタンを出す。0 本のときは押せない
 * - どちらのボタンも、押すと `download` を発火する
 */
const meta = {
  component: BottomActionBar,
  tags: ['autodocs'],
  args: {
    count: 6,
    size: '4.2 GB',
    onDownload: fn(),
  },
} satisfies Meta<typeof BottomActionBar>

export default meta
type Story = StoryObj<typeof meta>

/** すべての動画をダウンロードする。押すと `download` が 1 回発火する。 */
export const All: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: /すべてダウンロード/ }),
    )
    await expect(args.onDownload).toHaveBeenCalledOnce()
  },
}

/** 選択モードで、まだ 1 本も選んでいない。ダウンロードボタンは押せない。 */
export const SelectionEmpty: Story = {
  args: { variant: 'selection', count: 0, size: '0 MB' },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('未選択')).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: 'ダウンロード' }),
    ).toBeDisabled()
  },
}

/** 選択モードで、3 本選んでいる。 */
export const Selection: Story = {
  args: { variant: 'selection', count: 3, size: '2.2 GB' },
}
