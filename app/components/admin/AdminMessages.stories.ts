import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import { adminParameters, withAdminEditor } from '../../../.storybook/admin'
import AdminMessages from './AdminMessages.vue'

/** 管理画面の下に出す知らせ。終わったことの知らせ (`info`) と、エラー (`error`) がある。 */
const meta = {
  component: AdminMessages,
  tags: ['autodocs'],
  parameters: adminParameters,
} satisfies Meta<typeof AdminMessages>

export default meta
type Story = StoryObj<typeof meta>

/** 終わったことの知らせ。 */
export const Info: Story = {
  decorators: [
    withAdminEditor((editor) => {
      editor.state.messages = {
        kind: 'info',
        lines: ['3 本アップロードしました'],
      }
    }),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('status')).toHaveTextContent(
      '3 本アップロードしました',
    )
  },
}

/** エラー。誤りが複数あれば 1 行ずつ出す。 */
export const Errors: Story = {
  decorators: [
    withAdminEditor((editor) => {
      editor.state.messages = {
        kind: 'error',
        lines: [
          '長さ (秒) を書いてください: 予選/M1256.mp4',
          '出演は No. をカンマで区切って書いてください: 本戦/M1268.mp4',
        ],
      }
    }),
  ],
}

/** 知らせがなければ何も出さない。 */
export const None: Story = {
  decorators: [withAdminEditor()],
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('status')).toBeNull()
  },
}
