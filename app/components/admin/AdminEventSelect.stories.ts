import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import { adminParameters, registeredEvent } from '../../../.storybook/admin'
import AdminEventSelect from './AdminEventSelect.vue'

/** 登録済みのイベントを選ぶ欄。選択肢には開催日・シリーズ名・イベント名・キーを出す。 */
const meta = {
  component: AdminEventSelect,
  tags: ['autodocs'],
  parameters: adminParameters,
  args: {
    label: '登録済みのイベント',
    emptyLabel: '選んでください',
    events: [registeredEvent],
    modelValue: '',
  },
} satisfies Meta<typeof AdminEventSelect>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('登録済みのイベント')).toHaveValue('')
    await expect(
      canvas.getByRole('option', {
        name: '2026-11-01 エルニーニョ / エルニーニョ vol.5 (elnino/elnino_vol_5)',
      }),
    ).toBeInTheDocument()
  },
}

/** 選んだところ。 */
export const Selected: Story = {
  args: { modelValue: 'elnino/elnino_vol_5' },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('登録済みのイベント')).toHaveValue(
      'elnino/elnino_vol_5',
    )
  },
}
