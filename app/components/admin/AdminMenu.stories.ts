import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import { adminParameters } from '../../../.storybook/admin'
import AdminMenu from './AdminMenu.vue'

/** 管理画面の入口。登録の操作ごとのページへのリンクを並べる。 */
const meta = {
  component: AdminMenu,
  tags: ['autodocs'],
  parameters: adminParameters,
} satisfies Meta<typeof AdminMenu>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: /イベントを登録する/ }),
    ).toHaveAttribute('href', '/admin/events')
    await expect(
      canvas.getByRole('link', { name: /エントリーを登録する/ }),
    ).toHaveAttribute('href', '/admin/entries')
    await expect(
      canvas.getByRole('link', { name: /動画を登録する/ }),
    ).toHaveAttribute('href', '/admin/videos')
  },
}
