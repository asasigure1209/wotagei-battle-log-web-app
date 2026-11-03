import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import { adminParameters, withAdminEditor } from '../../../.storybook/admin'
import AdminEntriesSection from './AdminEntriesSection.vue'

/** 2. エントリー。「No.: 名前」の形で 1 行に 1 人ずつ書く。形の違う行は、その場で知らせる。 */
const meta = {
  component: AdminEntriesSection,
  tags: ['autodocs'],
  parameters: adminParameters,
} satisfies Meta<typeof AdminEntriesSection>

export default meta
type Story = StoryObj<typeof meta>

/** 書いた人数を見出しに出す。 */
export const Filled: Story = {
  decorators: [
    withAdminEditor((editor) => {
      editor.state.entriesText = '1: BLAZE\n2: しぐれ\n3: ヲタ'
    }),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/\(3 人\)/)).toBeVisible()
  },
}

/** 形の違う行と、重なった No. を知らせる。 */
export const WithProblems: Story = {
  decorators: [
    withAdminEditor((editor) => {
      editor.state.entriesText = '1: BLAZE\nしぐれ\n1: ヲタ'
    }),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('2 行目は「No.: 名前」の形で書いてください: しぐれ'),
    ).toBeVisible()
    await expect(
      canvas.getByText('エントリー No. 1 が重なっています'),
    ).toBeVisible()
  },
}

/** 書く人がまだいない。 */
export const Empty: Story = {
  decorators: [withAdminEditor()],
}
