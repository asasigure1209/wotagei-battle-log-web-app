import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import {
  adminParameters,
  registeredEvent,
  withAdminEventForm,
} from '../../../.storybook/admin'
import AdminEventForm from './AdminEventForm.vue'

/**
 * イベントの登録。登録済みのイベントを選んで直すか、新しいイベントの情報を書いて登録する。
 * 選んだイベントは、シリーズ ID・イベント ID を変えられず、消せる (誤って消さないよう、2 回押す)。
 */
const meta = {
  component: AdminEventForm,
  tags: ['autodocs'],
  parameters: adminParameters,
} satisfies Meta<typeof AdminEventForm>

export default meta
type Story = StoryObj<typeof meta>

/** 新しいイベントを書き始めたところ。ID を書くまでは登録できない。 */
export const New: Story = {
  decorators: [
    withAdminEventForm((form) => {
      form.state.list = [registeredEvent]
    }),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText('登録済みのイベントを直す')).toHaveValue(
      '',
    )
    await expect(
      canvas.getByLabelText('シリーズ ID (英数字と _ -)'),
    ).toBeEnabled()
    await expect(
      canvas.getByRole('button', { name: '登録する' }),
    ).toBeDisabled()
  },
}

/** ID に使えない文字があれば注意を出す。 */
export const InvalidId: Story = {
  decorators: [
    withAdminEventForm((form) => {
      form.state.form.seriesId = 'エルニーニョ'
    }),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('ID は英数字と _ - だけで書いてください'),
    ).toBeVisible()
  },
}

/**
 * 登録済みのイベントを選んだところ。ID は変えられず、エントリーと動画の登録へ進める。
 * 消すボタンは、1 回目は確かめるだけで、もう一度押すと消す。
 */
export const Selected: Story = {
  decorators: [
    withAdminEventForm((form) => {
      form.state.list = [registeredEvent]
      form.open('elnino/elnino_vol_5')
    }),
  ],
  play: async ({ canvas, userEvent }) => {
    await expect(canvas.getByLabelText('登録済みのイベントを直す')).toHaveValue(
      'elnino/elnino_vol_5',
    )
    await expect(
      canvas.getByLabelText('イベント ID (英数字と _ -)'),
    ).toBeDisabled()
    await expect(
      canvas.getByRole('link', { name: 'エントリーと動画の登録へ' }),
    ).toHaveAttribute('href', '/admin/entries')
    await userEvent.click(
      canvas.getByRole('button', { name: 'このイベントを消す' }),
    )
    await expect(
      canvas.getByRole('button', { name: 'もう一度押すと DB から消します' }),
    ).toBeVisible()
  },
}
