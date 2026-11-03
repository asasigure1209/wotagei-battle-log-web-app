import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import {
  adminParameters,
  fillEvent,
  withAdminEditor,
} from '../../../.storybook/admin'
import AdminEventSection from './AdminEventSection.vue'

const events = [
  {
    seriesId: 'elnino',
    seriesName: 'エルニーニョ',
    eventId: 'elnino_vol_5',
    eventName: 'エルニーニョ vol.5',
    date: '2026-11-01',
  },
]

/**
 * 1. イベント。登録済みのイベントを選んで読み込むか、新しいイベントの情報を書く。
 * 読み込んだイベントは、シリーズ ID・イベント ID を変えられない。
 */
const meta = {
  component: AdminEventSection,
  tags: ['autodocs'],
  parameters: adminParameters,
} satisfies Meta<typeof AdminEventSection>

export default meta
type Story = StoryObj<typeof meta>

/** 新しいイベントを書き始めたところ。 */
export const New: Story = {
  decorators: [
    withAdminEditor((editor) => {
      editor.events.list.value = events
    }),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox')).toHaveValue('')
    await expect(
      canvas.getByLabelText('シリーズ ID (英数字と _ -)'),
    ).toBeEnabled()
  },
}

/** ID に使えない文字があれば注意を出す。 */
export const InvalidId: Story = {
  decorators: [
    withAdminEditor((editor) => {
      editor.state.form.seriesId = 'エルニーニョ'
    }),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('ID は英数字と _ - だけで書いてください'),
    ).toBeVisible()
  },
}

/** 登録済みのイベントを読み込んだところ。ID は変えられない。 */
export const Loaded: Story = {
  decorators: [
    withAdminEditor((editor) => {
      editor.events.list.value = events
      fillEvent(editor)
      editor.state.loaded = true
    }),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox')).toHaveValue(
      'elnino/elnino_vol_5',
    )
    await expect(
      canvas.getByLabelText('シリーズ ID (英数字と _ -)'),
    ).toBeDisabled()
    await expect(
      canvas.getByLabelText('イベント ID (英数字と _ -)'),
    ).toBeDisabled()
  },
}
