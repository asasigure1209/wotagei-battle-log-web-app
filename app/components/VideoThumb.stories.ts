import type { Meta, StoryObj } from '@storybook/vue3-vite'
import VideoThumb from './VideoThumb.vue'

/**
 * 動画のサムネイル。右下に再生時間を重ねる。
 *
 * - 画像 (`src`) がないときは、縞模様の上に動画の番号を大きく表示する
 * - 飾りとして読み上げからは隠している。動画の名前は隣に文字で置く
 */
const meta = {
  component: VideoThumb,
  tags: ['autodocs'],
  args: { no: '01', duration: '03:12' },
} satisfies Meta<typeof VideoThumb>

export default meta
type Story = StoryObj<typeof meta>

/** サムネイル画像がないときの仮の画像。 */
export const Placeholder: Story = {}
