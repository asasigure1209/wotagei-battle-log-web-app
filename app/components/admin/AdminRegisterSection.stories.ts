import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import {
  adminParameters,
  fillEvent,
  videoRow,
  withAdminVideoEditor,
} from '../../../.storybook/admin'
import AdminRegisterSection from './AdminRegisterSection.vue'

/** 3. DB に登録。エントリーが登録済みで、すべての動画が R2 にあれば、選んだイベントに動画と出演者を登録できる。 */
const meta = {
  component: AdminRegisterSection,
  tags: ['autodocs'],
  parameters: adminParameters,
} satisfies Meta<typeof AdminRegisterSection>

export default meta
type Story = StoryObj<typeof meta>

/** すべての動画が R2 にあり、登録できる。 */
export const Ready: Story = {
  decorators: [
    withAdminVideoEditor((editor) => {
      fillEvent(editor)
      editor.state.rows = [videoRow('予選/M1256.mp4', { sizeBytes: 10 })]
      editor.state.remote = new Map([['予選/M1256.mp4', 10]])
    }),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '確認だけ' })).toBeEnabled()
    await expect(canvas.getByRole('button', { name: '登録する' })).toBeEnabled()
  },
}

/** R2 にまだない動画があると、登録できない。 */
export const NotUploaded: Story = {
  decorators: [
    withAdminVideoEditor((editor) => {
      fillEvent(editor)
      editor.state.rows = [videoRow('予選/M1256.mp4', { withFile: true })]
      editor.state.remote = new Map()
    }),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: '登録する' }),
    ).toBeDisabled()
  },
}

/** 選んだイベントにエントリーがまだなければ、登録できない。 */
export const NoEntries: Story = {
  decorators: [
    withAdminVideoEditor((editor) => {
      fillEvent(editor)
      editor.state.entries = []
      editor.state.rows = [videoRow('予選/M1256.mp4', { sizeBytes: 10 })]
      editor.state.remote = new Map([['予選/M1256.mp4', 10]])
    }),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: '登録する' }),
    ).toBeDisabled()
  },
}

/** 選んだイベントの公開ページを開ける。 */
export const PublicLink: Story = {
  decorators: [withAdminVideoEditor(fillEvent)],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: '公開ページを開く' }),
    ).toHaveAttribute('href', '/elnino/elnino_vol_5')
  },
}

/** イベントを選んでいなければ、登録できない。 */
export const NotSelected: Story = {
  decorators: [
    withAdminVideoEditor((editor) => {
      editor.state.rows = [videoRow('予選/M1256.mp4', { sizeBytes: 10 })]
      editor.state.remote = new Map([['予選/M1256.mp4', 10]])
    }),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: '登録する' }),
    ).toBeDisabled()
    await expect(canvas.queryByRole('link')).toBeNull()
  },
}
