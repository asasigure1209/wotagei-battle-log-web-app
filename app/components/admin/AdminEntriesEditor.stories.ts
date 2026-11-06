import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, waitFor } from 'storybook/test'
import {
  adminParameters,
  registeredEvent,
  selectedEvent,
} from '../../../.storybook/admin'
import AdminEntriesEditor from './AdminEntriesEditor.vue'

/**
 * 登録済みのイベントを選び、エントリーと動画を登録するまでの画面全体。
 * 開くと、登録済みのイベントの一覧を読み込む。
 */
const meta = {
  component: AdminEntriesEditor,
  tags: ['autodocs'],
  // 開いたときに読み込む、登録済みのイベントの一覧
  parameters: { ...adminParameters, fetch: [registeredEvent] },
} satisfies Meta<typeof AdminEntriesEditor>

export default meta
type Story = StoryObj<typeof meta>

/** 開いたところ。登録済みのイベントを選択肢に出し、選ぶまではエントリーを書けない。 */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('option', {
        name: /エルニーニョ vol\.5/,
      }),
    ).toBeInTheDocument()
    await expect(canvas.getByLabelText(/1 行に 1 人/)).toBeDisabled()
  },
}

/** 登録済みのイベントを選ぶと、そのイベントのエントリーと動画を読み込み、エントリーを書けるようになる。 */
export const SelectEvent: Story = {
  parameters: {
    // 一覧・選んだイベント・R2 の動画で、返す値を分ける
    fetch: (url: string) => {
      if (url === '/api/admin/events') return [registeredEvent]
      if (url === '/api/admin/objects') return []
      return {
        ...selectedEvent,
        entries: [{ entryNo: 1, name: 'BLAZE' }],
        videos: [],
      }
    },
  },
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('option', { name: /エルニーニョ vol\.5/ })
    await userEvent.selectOptions(
      canvas.getByRole('combobox'),
      'elnino/elnino_vol_5',
    )
    const entries = canvas.getByLabelText(/1 行に 1 人/)
    await waitFor(() => expect(entries).toBeEnabled())
    await expect(entries).toHaveValue('1: BLAZE')
    await expect(canvas.getByText('X: @elnino')).toBeVisible()
  },
}
