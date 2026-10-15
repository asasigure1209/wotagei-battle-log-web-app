import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PlayerRow from './PlayerRow.vue'

/** イベントページのプレイヤー一覧の 1 行。行全体がプレイヤーの動画一覧ページへのリンクになる。 */
const meta = {
  component: PlayerRow,
  tags: ['autodocs'],
  args: { entryNo: '05', playerName: 'はやて', count: 6, href: '#' },
} satisfies Meta<typeof PlayerRow>

export default meta
type Story = StoryObj<typeof meta>

/** 日本語の名前。 */
export const Default: Story = {}

/** 英字の名前。 */
export const LatinName: Story = {
  args: { entryNo: '07', playerName: 'Akatsuki', count: 4 },
}
