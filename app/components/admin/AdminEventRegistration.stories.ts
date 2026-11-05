import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import { adminParameters, registeredEvent } from '../../../.storybook/admin'
import AdminEventRegistration from './AdminEventRegistration.vue'

/** イベントの登録の画面全体。開くと、登録済みのイベントの一覧を読み込む。 */
const meta = {
  component: AdminEventRegistration,
  tags: ['autodocs'],
  // 開いたときに読み込む、登録済みのイベントの一覧
  parameters: { ...adminParameters, fetch: [registeredEvent] },
} satisfies Meta<typeof AdminEventRegistration>

export default meta
type Story = StoryObj<typeof meta>

/** 新しいイベントを書き始めたところ。登録済みのイベントを選択肢に出す。 */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('option', { name: /エルニーニョ vol\.5/ }),
    ).toBeInTheDocument()
  },
}

/** ?event= で開くと、そのイベントを選んだ状態になる。 */
export const InitialEvent: Story = {
  args: { initialEvent: 'elnino/elnino_vol_5' },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByDisplayValue('エルニーニョ vol.5'),
    ).toBeVisible()
  },
}
