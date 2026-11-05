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
 * 1. イベントを選ぶ。エントリーと動画を登録する、登録済みのイベントを選ぶ。
 * イベントの情報はここでは直さず、イベントの登録の画面へ案内する。
 */
const meta = {
  component: AdminEventPicker,
  tags: ['autodocs'],
  parameters: adminParameters,
} satisfies Meta<typeof AdminEventPicker>

export default meta
type Story = StoryObj<typeof meta>

/** まだ選んでいない。 */
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

/** 選んだイベントの情報を出し、そのイベントを直す画面へのリンクを出す。 */
export const Selected: Story = {
  decorators: [withAdminEditor(fillEvent)],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox')).toHaveValue(
      'elnino/elnino_vol_5',
    )
    await expect(canvas.getByText('X: @elnino')).toBeVisible()
    await expect(
      canvas.getByRole('link', { name: 'イベントの登録' }),
    ).toHaveAttribute('href', '/admin/events?event=elnino/elnino_vol_5')
  },
}

/** イベントがまだない。先にイベントを登録するよう案内する。 */
export const NoEvents: Story = {
  decorators: [withAdminEditor()],
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('combobox')).toBeNull()
    await expect(
      canvas.getByRole('link', { name: 'イベントを登録' }),
    ).toHaveAttribute('href', '/admin/events')
  },
}
