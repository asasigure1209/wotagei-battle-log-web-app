import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, waitFor } from 'storybook/test'
import {
  adminParameters,
  fetchError,
  registeredEntries,
  registeredEvent,
  selectedEvent,
} from '../../../.storybook/admin'
import AdminVideoEditor from './AdminVideoEditor.vue'

/** 選んだイベントの、登録済みのエントリーと動画 (出演者はまだ 1 人) */
const registered = {
  ...selectedEvent,
  entries: registeredEntries,
  videos: [
    {
      key: 'elnino/elnino_vol_5/予選/M1256.mp4',
      durationSec: 192,
      sizeBytes: 10,
      performers: [1],
    },
  ],
}

/**
 * 一覧・選んだイベント・R2 の動画・動画の登録 (PUT) で返す値を分ける (Error なら投げる)。
 * R2 には registered の動画が同じサイズで置いてある
 */
function api(event: unknown = registered, saved: unknown = { ok: true }) {
  const results: Record<string, unknown> = {
    '/api/admin/events': [registeredEvent],
    '/api/admin/objects': [
      { key: 'elnino/elnino_vol_5/予選/M1256.mp4', size: 10 },
    ],
    '/api/admin/events/elnino/elnino_vol_5': event,
    '/api/admin/events/elnino/elnino_vol_5/videos': saved,
  }
  return (url: string) => results[url]
}

/**
 * 登録済みのイベントを選び、動画と出演者を登録するまでの画面全体。
 * 開くと、登録済みのイベントの一覧を読み込む。
 */
const meta = {
  component: AdminVideoEditor,
  tags: ['autodocs'],
  parameters: { ...adminParameters, fetch: api() },
} satisfies Meta<typeof AdminVideoEditor>

export default meta
type Story = StoryObj<typeof meta>

/** 開いたところ。登録済みのイベントを選択肢に出し、選ぶまでは動画を選べない。エントリーの欄はない。 */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('option', {
        name: /エルニーニョ vol\.5/,
      }),
    ).toBeInTheDocument()
    await expect(
      canvas.queryByRole('textbox', { name: /エントリー/ }),
    ).toBeNull()
    await expect(
      canvas.getByRole('button', { name: '登録する' }),
    ).toBeDisabled()
  },
}

/** 登録済みのイベントを選ぶと、そのイベントの動画を、登録済みの出演者を選んだ状態で読み込む。 */
export const SelectEvent: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('option', { name: /エルニーニョ vol\.5/ })
    await userEvent.selectOptions(
      canvas.getByRole('combobox', { name: '登録済みのイベント' }),
      'elnino/elnino_vol_5',
    )
    const first = await canvas.findByRole('combobox', {
      name: '予選/M1256.mp4 の出演者 1',
    })
    await expect(first).toHaveDisplayValue('No. 1 BLAZE')
    await expect(
      canvas.getByRole('combobox', { name: '予選/M1256.mp4 の出演者 2' }),
    ).toHaveDisplayValue('なし')
    await expect(canvas.getByText('X: @elnino')).toBeVisible()
  },
}

/** ?event= で開き、出演者 2 を選んで登録すると、知らせを出す。 */
export const SelectPerformersAndRegister: Story = {
  args: { initialEvent: 'elnino/elnino_vol_5' },
  play: async ({ canvas, userEvent }) => {
    const second = await canvas.findByRole('combobox', {
      name: '予選/M1256.mp4 の出演者 2',
    })
    await userEvent.selectOptions(second, 'No. 2 しぐれ')
    await expect(second).toHaveDisplayValue('No. 2 しぐれ')
    const register = canvas.getByRole('button', { name: '登録する' })
    await waitFor(() => expect(register).toBeEnabled())
    await userEvent.click(register)
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      '登録しました',
    )
  },
}

/** 登録をサーバーが弾いたら (R2 の動画のサイズが違うなど)、その誤りをそのまま出す。 */
export const Rejected: Story = {
  args: { initialEvent: 'elnino/elnino_vol_5' },
  parameters: {
    fetch: api(
      registered,
      fetchError(400, 'elnino/elnino_vol_5/予選/M1256.mp4 のサイズが違います'),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    const register = canvas.getByRole('button', { name: '登録する' })
    await waitFor(() => expect(register).toBeEnabled())
    await userEvent.click(register)
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'elnino/elnino_vol_5/予選/M1256.mp4 のサイズが違います',
    )
  },
}

/** 出演者 1 と出演者 2 に同じ人を選ぶと、その場で誤りを出し、登録しようとしても送らずに誤りを出す。 */
export const SamePerformerTwice: Story = {
  args: { initialEvent: 'elnino/elnino_vol_5' },
  play: async ({ canvas, userEvent }) => {
    const second = await canvas.findByRole('combobox', {
      name: '予選/M1256.mp4 の出演者 2',
    })
    await userEvent.selectOptions(second, 'No. 1 BLAZE')
    await expect(
      canvas.getByText('出演者 1 と出演者 2 に同じ人を選んでいます'),
    ).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: '登録する' }))
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      '出演者 1 と出演者 2 に同じ人を選んでいます: 予選/M1256.mp4',
    )
  },
}

/** 登録済みのエントリーにない No. が出演者に入っている (古いデータ) と、そのことを出し、登録の前に誤りにする。 */
export const UnregisteredPerformer: Story = {
  args: { initialEvent: 'elnino/elnino_vol_5' },
  parameters: {
    fetch: api({
      ...registered,
      videos: [{ ...registered.videos[0], performers: [1, 9] }],
    }),
  },
  play: async ({ canvas, userEvent }) => {
    const second = await canvas.findByRole('combobox', {
      name: '予選/M1256.mp4 の出演者 2',
    })
    await expect(second).toHaveDisplayValue('No. 9 (登録されていない)')
    await expect(
      canvas.getByText('出演者の No. 9 は登録されていません'),
    ).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: '確認だけ' }))
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      '出演者の No. 9 は登録されていません: 予選/M1256.mp4',
    )
  },
}

/** エントリーが 1 人もいなければ、エントリーの登録へ案内し、登録できない。 */
export const NoEntries: Story = {
  args: { initialEvent: 'elnino/elnino_vol_5' },
  parameters: { fetch: api({ ...registered, entries: [], videos: [] }) },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('link', {
        name: '先にエントリーを登録してください',
      }),
    ).toHaveAttribute('href', '/admin/entries?event=elnino/elnino_vol_5')
    await expect(
      canvas.getByRole('button', { name: '登録する' }),
    ).toBeDisabled()
  },
}
