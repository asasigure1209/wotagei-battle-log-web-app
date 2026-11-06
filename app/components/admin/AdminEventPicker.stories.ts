import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn } from 'storybook/test'
import {
  adminParameters,
  registeredEvent,
  selectedEvent,
} from '../../../.storybook/admin'
import AdminEventPicker from './AdminEventPicker.vue'

/**
 * 1. イベントを選ぶ。エントリーと動画を登録する、登録済みのイベントを選ぶ。
 * イベントの情報はここでは直さず、イベントの登録の画面へ案内する。
 *
 * 選んだイベントのキー (`シリーズID/イベントID`) を `v-model` でやり取りし、
 * 読み込んだイベントの情報は `event` で受け取って出すだけにする (読み込むのは親)。
 */
const meta = {
  component: AdminEventPicker,
  tags: ['autodocs'],
  parameters: adminParameters,
  args: {
    events: [registeredEvent],
    event: null,
    modelValue: '',
    'onUpdate:modelValue': fn(),
  },
} satisfies Meta<typeof AdminEventPicker>

export default meta
type Story = StoryObj<typeof meta>

/** まだ選んでいない。選ぶと `update:modelValue` がそのイベントのキーで発火する。 */
export const NotSelected: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await expect(canvas.getByRole('combobox')).toHaveValue('')
    await expect(
      canvas.getByRole('link', { name: 'イベントの登録' }),
    ).toHaveAttribute('href', '/admin/events')
    await userEvent.selectOptions(
      canvas.getByRole('combobox'),
      'elnino/elnino_vol_5',
    )
    await expect(args['onUpdate:modelValue']).toHaveBeenCalledWith(
      'elnino/elnino_vol_5',
    )
  },
}

/** 選んだイベントの情報を出し、そのイベントを直す画面へのリンクを出す。 */
export const Selected: Story = {
  args: { modelValue: 'elnino/elnino_vol_5', event: selectedEvent },
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

/** 読み込みなどで待っている間は、選び直せない。 */
export const Busy: Story = {
  args: { busy: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox')).toBeDisabled()
  },
}

/** イベントがまだない。先にイベントを登録するよう案内する。 */
export const NoEvents: Story = {
  args: { events: [] },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('combobox')).toBeNull()
    await expect(
      canvas.getByRole('link', { name: 'イベントを登録' }),
    ).toHaveAttribute('href', '/admin/events')
  },
}
