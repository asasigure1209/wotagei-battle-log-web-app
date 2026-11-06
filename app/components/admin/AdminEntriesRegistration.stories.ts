import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, waitFor } from 'storybook/test'
import {
  adminParameters,
  fetchError,
  registeredEvent,
  selectedEvent,
} from '../../../.storybook/admin'
import AdminEntriesRegistration from './AdminEntriesRegistration.vue'

/** 選んだイベントの、登録済みのエントリー (No. の順に並ばずに返ってきても、No. の順に並べる) */
const registered = {
  ...selectedEvent,
  entries: [
    { entryNo: 2, name: 'しぐれ' },
    { entryNo: 1, name: 'BLAZE' },
  ],
  videos: [],
}

/** No. に抜けがある登録済みのエントリー (db:import や動画の画面で「1: BLAZE / 3: ヲタ」のように作れる) */
const withGap = {
  ...registered,
  entries: [
    { entryNo: 1, name: 'BLAZE' },
    { entryNo: 3, name: 'ヲタ' },
  ],
}

/** 一覧と選んだイベントで返す値を分け、エントリーの登録 (PUT) には saved を返す (Error なら投げる) */
function api(saved: unknown = { ok: true }, event: unknown = registered) {
  return (url: string) => {
    if (url === '/api/admin/events') return [registeredEvent]
    if (url.endsWith('/entries')) return saved
    return event
  }
}

/**
 * 登録済みのイベントを選び、エントリーを登録するまでの画面全体。
 * 開くと、登録済みのイベントの一覧を読み込む。
 */
const meta = {
  component: AdminEntriesRegistration,
  tags: ['autodocs'],
  parameters: { ...adminParameters, fetch: api() },
} satisfies Meta<typeof AdminEntriesRegistration>

export default meta
type Story = StoryObj<typeof meta>

/** 開いたところ。登録済みのイベントを選択肢に出し、選ぶまではエントリーを書けない。 */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole('option', { name: /エルニーニョ vol\.5/ }),
    ).toBeInTheDocument()
    await expect(canvas.getByLabelText(/1 行に 1 人/)).toBeDisabled()
    await expect(
      canvas.getByRole('button', { name: '登録する' }),
    ).toBeDisabled()
  },
}

/** 登録済みのイベントを選ぶと、登録済みのエントリーの名前を No. の順に読み込み、書けるようになる。 */
export const SelectEvent: Story = {
  play: async ({ canvas, userEvent }) => {
    await canvas.findByRole('option', { name: /エルニーニョ vol\.5/ })
    await userEvent.selectOptions(
      canvas.getByRole('combobox'),
      'elnino/elnino_vol_5',
    )
    const names = canvas.getByLabelText(/1 行に 1 人/)
    await waitFor(() => expect(names).toBeEnabled())
    await expect(names).toHaveValue('BLAZE\nしぐれ')
    await expect(canvas.getByText('X: @elnino')).toBeVisible()
  },
}

/** ?event= で開くと、そのイベントを選んだ状態になる。登録すると知らせを出し、動画の登録へ案内する。 */
export const InitialEventAndRegister: Story = {
  args: { initialEvent: 'elnino/elnino_vol_5' },
  play: async ({ canvas, userEvent }) => {
    const names = canvas.getByLabelText(/1 行に 1 人/)
    await waitFor(() => expect(names).toHaveValue('BLAZE\nしぐれ'))
    await userEvent.type(names, '\nヲタ')
    await userEvent.click(canvas.getByRole('button', { name: '登録する' }))
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      '登録しました',
    )
    await expect(
      canvas.getByRole('link', { name: 'このイベントの動画を登録する' }),
    ).toHaveAttribute('href', '/admin/videos?event=elnino/elnino_vol_5')
  },
}

/** 動画に出ているエントリーが消える登録は、サーバーが弾き、その誤りをそのまま出す。 */
export const Rejected: Story = {
  args: { initialEvent: 'elnino/elnino_vol_5' },
  parameters: {
    fetch: api(
      fetchError(400, 'エントリー No. 2 は動画に出ているので消せません'),
    ),
  },
  play: async ({ canvas, userEvent }) => {
    const names = canvas.getByLabelText(/1 行に 1 人/)
    await waitFor(() => expect(names).toHaveValue('BLAZE\nしぐれ'))
    await userEvent.clear(names)
    await userEvent.type(names, 'BLAZE')
    await userEvent.click(canvas.getByRole('button', { name: '登録する' }))
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'エントリー No. 2 は動画に出ているので消せません',
    )
    await expect(
      canvas.queryByRole('link', { name: /動画を登録する/ }),
    ).toBeNull()
  },
}

/** 読み込んだエントリーの No. に抜けがあれば、誤りを出し、登録できない。 */
export const EntryNosGap: Story = {
  args: { initialEvent: 'elnino/elnino_vol_5' },
  parameters: { fetch: api({ ok: true }, withGap) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'No. に抜けがあります (1, 3)',
    )
    await expect(canvas.getByLabelText(/1 行に 1 人/)).toHaveValue(
      'BLAZE\nヲタ',
    )
    await expect(
      canvas.getByRole('button', { name: '登録する' }),
    ).toBeDisabled()
  },
}
