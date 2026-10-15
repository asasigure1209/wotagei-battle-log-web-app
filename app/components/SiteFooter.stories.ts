import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SiteFooter from './SiteFooter.vue'

/** ページの一番下に置くフッター。名前や動画が見つからないときの、運営への連絡先を示す。 */
const meta = {
  component: SiteFooter,
  tags: ['autodocs'],
  args: { contact: '[運営の連絡先]', contactHref: '#' },
} satisfies Meta<typeof SiteFooter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
