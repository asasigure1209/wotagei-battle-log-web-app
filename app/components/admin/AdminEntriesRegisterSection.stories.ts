import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect } from 'storybook/test'
import {
  adminParameters,
  fillEntryNames,
  withAdminEntriesForm,
} from '../../../.storybook/admin'
import AdminEntriesRegisterSection from './AdminEntriesRegisterSection.vue'

/**
 * 3. DB に登録。書いた名前を、選んだイベントのエントリーとして登録する (確認だけもできる)。
 * 登録できたら、そのイベントの動画の登録へ案内する。
 */
const meta = {
  component: AdminEntriesRegisterSection,
  tags: ['autodocs'],
  parameters: adminParameters,
} satisfies Meta<typeof AdminEntriesRegisterSection>

export default meta
type Story = StoryObj<typeof meta>

/** イベントを選び、名前を書いていれば登録できる。まだ登録していないので、動画の登録へのリンクは出さない。 */
export const Ready: Story = {
  decorators: [withAdminEntriesForm(fillEntryNames)],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: '確認だけ' })).toBeEnabled()
    await expect(canvas.getByRole('button', { name: '登録する' })).toBeEnabled()
    await expect(canvas.queryByRole('link')).toBeNull()
  },
}

/** 登録すると、そのイベントの動画の登録へのリンクを出す。 */
export const Registered: Story = {
  decorators: [withAdminEntriesForm(fillEntryNames)],
  parameters: { fetch: { ok: true } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '登録する' }))
    await expect(
      await canvas.findByRole('link', { name: 'このイベントの動画を登録する' }),
    ).toHaveAttribute('href', '/admin/videos?event=elnino/elnino_vol_5')
  },
}

/** 確認だけでは、動画の登録へのリンクを出さない。 */
export const DryRun: Story = {
  decorators: [withAdminEntriesForm(fillEntryNames)],
  parameters: { fetch: { ok: true } },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: '確認だけ' }))
    await expect(canvas.getByRole('button', { name: '確認だけ' })).toBeEnabled()
    await expect(canvas.queryByRole('link')).toBeNull()
  },
}

/** 名前が 1 人もいなければ、登録できない。 */
export const NoNames: Story = {
  decorators: [
    withAdminEntriesForm((form) => {
      fillEntryNames(form)
      form.state.namesText = '\n  \n'
    }),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: '確認だけ' }),
    ).toBeDisabled()
    await expect(
      canvas.getByRole('button', { name: '登録する' }),
    ).toBeDisabled()
  },
}

/** イベントを選んでいなければ、登録できない。 */
export const NotSelected: Story = {
  decorators: [
    withAdminEntriesForm((form) => {
      form.state.namesText = 'BLAZE'
    }),
  ],
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: '登録する' }),
    ).toBeDisabled()
  },
}
