import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, within } from 'storybook/test'
import {
  adminParameters,
  fillEntryNames,
  withAdminEntriesForm,
} from '../../../.storybook/admin'
import AdminEntryNamesSection from './AdminEntryNamesSection.vue'

/**
 * 2. エントリー。名前だけを 1 行に 1 人ずつ書く。エントリー No. は書いた順に 1 から付くので、
 * 横に No. と名前を並べて見せる。途中の行を消したり足したりすると No. がずれることを注意する。
 */
const meta = {
  component: AdminEntryNamesSection,
  tags: ['autodocs'],
  parameters: adminParameters,
} satisfies Meta<typeof AdminEntryNamesSection>

export default meta
type Story = StoryObj<typeof meta>

/** 書いた名前に、書いた順の No. を付けて並べ、人数を出す。 */
export const Filled: Story = {
  decorators: [withAdminEntriesForm(fillEntryNames)],
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/\(3 人\)/)).toBeVisible()
    const rows = within(
      canvas.getByRole('table', { name: 'エントリー No. と名前' }),
    ).getAllByRole('row')
    // 見出しの行のあとに、No. の順に並ぶ
    await expect(rows.map((r) => r.textContent)).toEqual([
      'No.名前',
      '1BLAZE',
      '2しぐれ',
      '3ヲタ',
    ])
    await expect(canvas.getByText(/No\. がずれ/)).toBeVisible()
  },
}

/** 書き足すと、空行と前後の空白を除いて、書いた順に No. が付く。 */
export const Typing: Story = {
  decorators: [withAdminEntriesForm(fillEntryNames)],
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText(/1 行に 1 人/), '\n\n  はやて ')
    await expect(canvas.getByText(/\(4 人\)/)).toBeVisible()
    await expect(canvas.getByRole('row', { name: '4 はやて' })).toBeVisible()
  },
}

/** 送っている間は書き換えられない。 */
export const Busy: Story = {
  decorators: [
    withAdminEntriesForm((form) => {
      fillEntryNames(form)
      form.state.busy = true
    }),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText(/1 行に 1 人/)).toBeDisabled()
  },
}

/** イベントを選ぶまでは書けない。 */
export const NotSelected: Story = {
  decorators: [withAdminEntriesForm()],
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText(/1 行に 1 人/)).toBeDisabled()
    await expect(canvas.getByText(/\(0 人\)/)).toBeVisible()
  },
}
