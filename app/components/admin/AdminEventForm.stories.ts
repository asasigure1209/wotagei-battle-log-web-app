import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import { adminParameters, registeredEvent } from '../../../.storybook/admin'
import AdminEventForm from './AdminEventForm.vue'

/**
 * イベントの登録の画面。新しいイベントの情報を書いて登録するか、登録済みのイベントを選んで直す・消す。
 * 開くと、登録済みのイベントの一覧を読み込む。
 */
const meta = {
  component: AdminEventForm,
  tags: ['autodocs'],
  // 開いたときに読み込む、登録済みのイベントの一覧
  parameters: { ...adminParameters, fetch: [registeredEvent] },
} satisfies Meta<typeof AdminEventForm>

export default meta
type Story = StoryObj<typeof meta>

/** 新しいイベントを書き始めたところ。ID を書くまでは登録できない。 */
export const New: Story = {
  play: async ({ canvas }) => {
    await canvas.findByRole('option', { name: /エルニーニョ vol\.5/ })
    await expect(canvas.getByRole('combobox')).toHaveValue('')
    await expect(
      canvas.getByRole('button', { name: '登録する' }),
    ).toBeDisabled()
  },
}

/** ID に使えない文字があれば注意を出す。 */
export const InvalidId: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(
      canvas.getByLabelText('シリーズ ID (英数字と _ -)'),
      'エルニーニョ',
    )
    await expect(
      canvas.getByText('ID は英数字と _ - だけで書いてください'),
    ).toBeVisible()
  },
}

/** シリーズ名は同じシリーズのイベントで共通なので、変えるとほかのイベントの表示も変わることを知らせる。 */
export const SeriesRename: Story = {
  args: { initialEvent: 'elnino/elnino_vol_5' },
  parameters: {
    fetch: [
      registeredEvent,
      {
        ...registeredEvent,
        eventId: 'elnino_vol_6',
        eventName: 'エルニーニョ vol.6',
      },
    ],
  },
  play: async ({ canvas, userEvent }) => {
    const name = await canvas.findByDisplayValue('エルニーニョ')
    await userEvent.clear(name)
    await userEvent.type(name, 'El Niño')
    await expect(
      canvas.getByText(
        /このシリーズのほかの\s*1 件のイベントの表示も変わります/,
      ),
    ).toBeVisible()
  },
}

/** 新しく作るときに、もう登録されている ID を書くと、上書きしないよう登録できない。 */
export const Duplicated: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('option', { name: /エルニーニョ vol\.5/ })
    await userEvent.type(
      canvas.getByLabelText('シリーズ ID (英数字と _ -)'),
      'elnino',
    )
    await userEvent.type(
      canvas.getByLabelText('イベント ID (英数字と _ -)'),
      'elnino_vol_5',
    )
    await expect(
      canvas.getByText(/elnino\/elnino_vol_5 はもう登録されています/),
    ).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: '登録する' }),
    ).toBeDisabled()
  },
}

/** 登録済みのイベントを選んだところ。ID は変えられず、エントリー・動画の登録へ進める。消すときは 2 回押す。 */
export const Selected: Story = {
  args: { initialEvent: 'elnino/elnino_vol_5' },
  play: async ({ canvas, userEvent }) => {
    await expect(
      await canvas.findByDisplayValue('エルニーニョ vol.5'),
    ).toBeVisible()
    await expect(
      canvas.getByLabelText('シリーズ ID (英数字と _ -)'),
    ).toBeDisabled()
    await expect(
      canvas.getByRole('link', { name: 'エントリー・動画を登録する' }),
    ).toHaveAttribute('href', '/admin/entries?event=elnino%2Felnino_vol_5')
    await userEvent.click(
      canvas.getByRole('button', { name: 'このイベントを消す' }),
    )
    await expect(
      canvas.getByRole('button', {
        name: 'もう一度押すと、エントリー・動画ごと DB から消します',
      }),
    ).toBeVisible()
  },
}
