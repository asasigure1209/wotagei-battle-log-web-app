import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppEyebrow from './AppEyebrow.vue'

/** 見出しの上に添える小さな英字のラベル。ページの種類やエントリー番号を示す。 */
const meta = {
  component: AppEyebrow,
  tags: ['autodocs'],
  args: { text: 'VIDEO ARCHIVE' },
} satisfies Meta<typeof AppEyebrow>

export default meta
type Story = StoryObj<typeof meta>

/** イベントページの見出しの上に置く。 */
export const Default: Story = {}

/** プレイヤーのページで、名前の上にエントリー番号を示す。 */
export const EntryNo: Story = {
  args: { text: 'ENTRY No.05' },
}
