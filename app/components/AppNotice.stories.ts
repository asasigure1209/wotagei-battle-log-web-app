import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppNotice from './AppNotice.vue'

/** 補足や注意を伝える小さな文。種類によってアイコンや枠が付く。 */
const meta = {
  component: AppNotice,
  tags: ['autodocs'],
  args: {
    type: 'wifi',
    text: '容量が大きいため、Wi-Fi 環境でのダウンロードをおすすめします',
  },
} satisfies Meta<typeof AppNotice>

export default meta
type Story = StoryObj<typeof meta>

/** 通信量の注意。Wi-Fi のアイコンを添える。 */
export const Wifi: Story = {}

/** 動画の公開期限。 */
export const Expiry: Story = {
  args: { type: 'expiry', text: '公開期限：[YYYY/MM/DD] まで' },
}

/** ダウンロードの準備を待っている間の注意。枠で囲み、改行をそのまま表示する。 */
export const Caution: Story = {
  args: {
    type: 'caution',
    text: '準備ができると、自動でダウンロードが始まります。\n完了まで、この画面を開いたままにしてください。',
  },
}
