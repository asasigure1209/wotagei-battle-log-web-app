import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PlayerHeader from './PlayerHeader.vue'

/** プレイヤーの動画一覧ページのヘッダー。エントリー番号・名前と、動画の本数・合計の容量を示す。 */
const meta = {
  component: PlayerHeader,
  tags: ['autodocs'],
  args: { entryNo: '05', playerName: 'はやて', count: 6, totalSize: '4.2 GB' },
} satisfies Meta<typeof PlayerHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
