import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import {
  adminParameters,
  fillEvent,
  registeredEvent,
  withAdminEditor,
} from '../../../.storybook/admin'
import AdminEventPicker from './AdminEventPicker.vue'

/**
 * 1. イベント。エントリー・動画を登録するイベントを、登録済みのイベントから選ぶ。
 * イベントの情報はここでは変えず、イベントの登録の画面 (/admin/events) で書く。
 */
const meta = {
  component: AdminEventPicker,
  tags: ['autodocs'],
  parameters: adminParameters,
} satisfies Meta<typeof AdminEventPicker>

export default meta
type Story = StoryObj<typeof meta>

/** まだ選んでいないところ。一覧にないイベントは、イベントの登録の画面へ案内する。 */
export const NotSelected: Story = {
  decorators: [
    withAdminEditor((editor) => {
      editor.events.list.value = [registeredEvent]
    }),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox')).toHaveValue('')
    await expect(
      canvas.getByRole('link', { name: 'イベントの登録' }),
    ).toHaveAttribute('href', '/admin/events')
  },
}

/** 登録済みのイベントを選んだところ。イベントの情報を出し、直すときの行き先を案内する。 */
export const Selected: Story = {
  decorators: [
    withAdminEditor((editor) => {
      editor.events.list.value = [registeredEvent]
      fillEvent(editor)
    }),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox')).toHaveValue(
      'elnino/elnino_vol_5',
    )
    await expect(canvas.getByText('2026-11-01')).toBeVisible()
    const links = canvas.getAllByRole('link', { name: 'イベントの登録' })
    await expect(links.at(-1)).toHaveAttribute(
      'href',
      '/admin/events?event=elnino%2Felnino_vol_5',
    )
  },
}
