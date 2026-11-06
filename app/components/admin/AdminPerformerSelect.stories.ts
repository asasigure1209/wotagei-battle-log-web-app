import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn } from 'storybook/test'
import { adminParameters } from '../../../.storybook/admin'
import AdminPerformerSelect from './AdminPerformerSelect.vue'

/** 動画の出演者を 1 人選ぶ欄。選択肢は登録済みのエントリーを No. の順に「No. 名前」で並べる。 */
const meta = {
  component: AdminPerformerSelect,
  tags: ['autodocs'],
  parameters: adminParameters,
  args: {
    label: '予選/M1256.mp4 の出演者 2',
    emptyLabel: 'なし',
    entries: [
      { entryNo: 2, name: 'しぐれ' },
      { entryNo: 1, name: 'BLAZE' },
    ],
    modelValue: null,
    'onUpdate:modelValue': fn(),
  },
} satisfies Meta<typeof AdminPerformerSelect>

export default meta
type Story = StoryObj<typeof meta>

/** 選んでいないところ。選ぶと、そのエントリー No. を数で返す。 */
export const Default: Story = {
  play: async ({ args, canvas, userEvent }) => {
    const select = canvas.getByRole('combobox', {
      name: '予選/M1256.mp4 の出演者 2',
    })
    await expect(
      canvas.getAllByRole('option').map((o) => o.textContent?.trim()),
    ).toEqual(['なし', 'No. 1 BLAZE', 'No. 2 しぐれ'])
    await userEvent.selectOptions(select, 'No. 2 しぐれ')
    await expect(args['onUpdate:modelValue']).toHaveBeenCalledWith(2)
  },
}

/** 選んでいる No. が登録済みのエントリーにない (古いデータ) ときは、そのことが分かる選択肢で出す。 */
export const Unregistered: Story = {
  args: { modelValue: 9 },
  play: async ({ canvas }) => {
    const select = canvas.getByRole('combobox')
    await expect(select).toHaveDisplayValue('No. 9 (登録されていない)')
    await expect(select).toHaveAttribute('aria-invalid', 'true')
  },
}
