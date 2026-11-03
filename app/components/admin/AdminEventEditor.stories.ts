import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import { adminParameters, stubFetch } from '../../../.storybook/admin'
import AdminEventEditor from './AdminEventEditor.vue'

/**
 * 1 つのイベントを書いて登録するまでの画面全体。
 * 開くと、登録済みのイベントの一覧を読み込む。
 */
const meta = {
  component: AdminEventEditor,
  tags: ['autodocs'],
  parameters: adminParameters,
  beforeEach: () =>
    stubFetch(() => [
      {
        seriesId: 'elnino',
        seriesName: 'エルニーニョ',
        eventId: 'elnino_vol_5',
        eventName: 'エルニーニョ vol.5',
        date: '2026-11-01',
      },
    ]),
} satisfies Meta<typeof AdminEventEditor>

export default meta
type Story = StoryObj<typeof meta>

/** 新しいイベントを書き始めたところ。登録済みのイベントを選択肢に出す。 */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('option', {
        name: /エルニーニョ vol\.5/,
      }),
    ).toBeInTheDocument()
  },
}
