import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import { adminParameters, registeredEvent } from '../../../.storybook/admin'
import AdminContentsEditor from './AdminContentsEditor.vue'

/**
 * 登録済みのイベントを選び、エントリーと動画を登録するまでの画面全体。
 * 開くと、登録済みのイベントの一覧を読み込む。イベントを選ぶまでは、エントリー・動画の欄を出さない。
 */
const meta = {
  component: AdminContentsEditor,
  tags: ['autodocs'],
  // 開いたときに読み込む、登録済みのイベントの一覧
  parameters: { ...adminParameters, fetch: [registeredEvent] },
} satisfies Meta<typeof AdminContentsEditor>

export default meta
type Story = StoryObj<typeof meta>

/** 開いたところ。登録済みのイベントを選択肢に出し、エントリー・動画の欄はまだ出さない。 */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('option', {
        name: /エルニーニョ vol\.5/,
      }),
    ).toBeInTheDocument()
    await expect(
      canvas.queryByRole('heading', { name: '2. エントリー' }),
    ).toBeNull()
  },
}
