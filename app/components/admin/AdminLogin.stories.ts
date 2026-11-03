import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn } from 'storybook/test'
import {
  adminParameters,
  fetchError,
  stubFetch,
} from '../../../.storybook/admin'
import AdminLogin from './AdminLogin.vue'

/**
 * 管理画面のログイン。合言葉を送り、合えば `login` を発火する。
 * 違えば、サーバーが返した文をそのまま出す。
 */
const meta = {
  component: AdminLogin,
  tags: ['autodocs'],
  parameters: adminParameters,
  args: { onLogin: fn() },
} satisfies Meta<typeof AdminLogin>

export default meta
type Story = StoryObj<typeof meta>

/** 合言葉を入れるまで、ログインのボタンは押せない。 */
export const Idle: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('button', { name: 'ログイン' }),
    ).toBeDisabled()
  },
}

/** 合言葉が合えば `login` が発火する。 */
export const Succeeds: Story = {
  beforeEach: () => stubFetch(() => ({ ok: true })),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('合言葉'), 'secret')
    await userEvent.click(canvas.getByRole('button', { name: 'ログイン' }))
    await expect(args.onLogin).toHaveBeenCalledOnce()
  },
}

/** 合言葉が違えば、サーバーの文を出し、`login` は発火しない。 */
export const WrongPassword: Story = {
  beforeEach: () => stubFetch(() => fetchError(401, '合言葉が違います')),
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText('合言葉'), 'wrong')
    await userEvent.click(canvas.getByRole('button', { name: 'ログイン' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent(
      '合言葉が違います',
    )
    await expect(args.onLogin).not.toHaveBeenCalled()
  },
}
