import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import {
  adminParameters,
  fillEvent,
  videoRow,
  withAdminEditor,
} from '../../../.storybook/admin'
import AdminRegisterSection from './AdminRegisterSection.vue'

/**
 * 4. DB に登録。すべての動画が R2 にあれば登録できる。
 * 読み込んだイベントは消せる (誤って消さないよう、2 回押す)。
 */
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
    withAdminEditor((editor) => {
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
    withAdminEditor((editor) => {
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

/** 登録済みのイベントは、公開ページを開け、消せる。1 回目は確かめるだけで、もう一度押すと消す。 */
export const Loaded: Story = {
  decorators: [
    withAdminEditor((editor) => {
      fillEvent(editor)
      editor.state.loaded = true
      editor.events.list.value = [
        {
          seriesId: 'elnino',
          seriesName: 'エルニーニョ',
          eventId: 'elnino_vol_5',
          eventName: 'エルニーニョ vol.5',
          date: '2026-11-01',
        },
      ]
    }),
  ],
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole('link', { name: '公開ページを開く' }),
    ).toHaveAttribute('href', '/elnino/elnino_vol_5')
    await userEvent.click(
      canvas.getByRole('button', { name: 'このイベントを消す' }),
    )
    await expect(
      canvas.getByRole('button', { name: 'もう一度押すと DB から消します' }),
    ).toBeVisible()
  },
}
