import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TopBar from './TopBar.vue'

/** プレイヤーのページの一番上に置くバー。左に一覧へ戻るリンク、右にイベントの名前を置く。 */
const meta = {
  component: TopBar,
  tags: ['autodocs'],
  args: {
    backLabel: 'プレイヤー一覧',
    backHref: '#',
    eventName: '[イベント名]',
  },
} satisfies Meta<typeof TopBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
