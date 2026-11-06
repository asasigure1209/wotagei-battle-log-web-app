import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import { markRaw } from 'vue'
import {
  adminParameters,
  fillEvent,
  videoRow,
  withAdminVideoEditor,
} from '../../../.storybook/admin'
import AdminVideosSection from './AdminVideosSection.vue'

/**
 * 3. 動画。ファイルを選んで並べ、R2 にアップロードする。
 * 行ごとに、R2 にあるか・送信中か・失敗したかを出す。R2 にない (またはサイズの違う) 動画だけを送る。
 */
const meta = {
  component: AdminVideosSection,
  tags: ['autodocs'],
  parameters: adminParameters,
} satisfies Meta<typeof AdminVideosSection>

export default meta
type Story = StoryObj<typeof meta>

/** まだ動画を選んでいない。 */
export const Empty: Story = {
  decorators: [withAdminVideoEditor(fillEvent)],
  play: async ({ canvas }) => {
    await expect(canvas.getByText('まだ動画がありません。')).toBeVisible()
  },
}

/** 行の状態の見本。R2 にあり・未アップロード・R2 と違う・R2 にない・失敗が並ぶ。 */
export const RowStates: Story = {
  decorators: [
    withAdminVideoEditor((editor) => {
      fillEvent(editor)
      editor.state.rows = [
        videoRow('予選/M1256.mp4', { sizeBytes: 100 }),
        videoRow('予選/M1257.mp4', { withFile: true, durationSec: null }),
        videoRow('予選/M1258.mp4', { withFile: true, sizeBytes: 300 }),
        videoRow('本戦/M1268.mp4', { performersText: '' }),
        videoRow('本戦/M1269.mp4', {
          withFile: true,
          error: 'アップロード失敗',
        }),
      ]
      editor.state.remote = new Map([
        ['予選/M1256.mp4', 100],
        ['予選/M1258.mp4', 299],
      ])
    }),
  ],
  play: async ({ canvas }) => {
    for (const label of [
      'R2 にあり',
      '未アップロード',
      'R2 と違う (上書き)',
      'R2 にない',
      'アップロード失敗',
    ]) {
      await expect(canvas.getByText(label)).toBeVisible()
    }
    // 送るのは、この画面で選んだファイルで R2 にない・サイズが違うもの (失敗したものも含む)
    await expect(
      canvas.getByRole('button', { name: /R2 にアップロード \(3 本/ }),
    ).toBeEnabled()
  },
}

/** アップロードしている間は、送信中の割合と中止のボタンを出す。 */
export const Uploading: Story = {
  decorators: [
    withAdminVideoEditor((editor) => {
      fillEvent(editor)
      editor.state.rows = [
        videoRow('予選/M1256.mp4', {
          withFile: true,
          sizeBytes: 1000,
          sentBytes: 420,
        }),
        videoRow('予選/M1257.mp4', { withFile: true }),
      ]
      editor.state.remote = new Map()
      editor.state.busy = true
      editor.state.uploadAbort = markRaw(new AbortController())
    }),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByText('送信中 42%')).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: 'アップロードを中止' }),
    ).toBeVisible()
  },
}

/** イベントを選んでいない (R2 をまだ調べていない) あいだは、R2 を確かめられず、アップロードもできない。 */
export const RemoteUnknown: Story = {
  decorators: [
    withAdminVideoEditor((editor) => {
      editor.state.rows = [videoRow('予選/M1256.mp4', { withFile: true })]
    }),
  ],
  play: async ({ canvas }) => {
    await expect(canvas.getByText('未確認')).toBeVisible()
    await expect(
      canvas.getByRole('button', { name: 'R2 を確認' }),
    ).toBeDisabled()
    await expect(
      canvas.getByRole('button', { name: /R2 にアップロード/ }),
    ).toBeDisabled()
  },
}
