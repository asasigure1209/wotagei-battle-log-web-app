import type { Meta, StoryObj } from '@storybook/vue3-vite'
import EventHeader from './EventHeader.vue'

/** イベントページの一番上に置くヘッダー。イベント名・開催日と、ページの使い方・動画の公開期限を示す。 */
const meta = {
  component: EventHeader,
  tags: ['autodocs'],
  args: {
    eventTitle: '[イベント名]',
    date: '[開催日]',
    expiry: '[YYYY/MM/DD]',
  },
} satisfies Meta<typeof EventHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
