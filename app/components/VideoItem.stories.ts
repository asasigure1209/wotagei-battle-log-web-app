import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn } from 'storybook/test'
import { ref, watch } from 'vue'
import VideoItem from './VideoItem.vue'

/**
 * プレイヤーの動画一覧の 1 項目。
 *
 * - 通常 (`default`) は 1 本ずつのダウンロードボタンを出し、押すと `download` を発火する
 * - 選択モード (`select`) はチェックボックスを出し、選んだかどうかを `v-model:selected` でやり取りする。選ぶと枠がアクセント色になる
 * - 保存が終わった動画は `status: 'done'` で「保存済み」と表示する
 */
const meta = {
  component: VideoItem,
  tags: ['autodocs'],
  args: {
    no: '01',
    file: 'video_01.mp4',
    duration: '03:12',
    fileSize: '742 MB',
    onDownload: fn(),
    'onUpdate:selected': fn(),
  },
  // 選んだかどうかはストーリーの中で持ち、親で v-model を使ったときと同じように動かす。
  // args に書き戻すと、play 関数の途中で Storybook が描画し直し、そのときに fn() の呼び出しの記録が消えてしまう
  render: (args) => ({
    components: { VideoItem },
    setup() {
      const selected = ref(args.selected)
      // Controls で変えた値は反映する
      watch(
        () => args.selected,
        (value) => {
          selected.value = value
        },
      )
      return { args, selected }
    },
    template: '<VideoItem v-bind="args" v-model:selected="selected" />',
  }),
} satisfies Meta<typeof VideoItem>

export default meta
type Story = StoryObj<typeof meta>

/** 通常の表示。ダウンロードボタンを押すと `download` が 1 回発火する。 */
export const Idle: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'video_01.mp4 をダウンロード' }),
    )
    await expect(args.onDownload).toHaveBeenCalledOnce()
  },
}

/** 保存が終わった動画。 */
export const Done: Story = {
  args: {
    no: '02',
    file: 'video_02.mp4',
    duration: '02:58',
    fileSize: '688 MB',
    status: 'done',
  },
}

/** 選択モードで、まだ選んでいない動画。チェックすると `update:selected` が `true` で発火し、枠がアクセント色になる。 */
export const SelectUnselected: Story = {
  args: {
    no: '03',
    file: 'video_03.mp4',
    duration: '03:40',
    fileSize: '815 MB',
    mode: 'select',
    selected: false,
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('checkbox', { name: /video_03\.mp4/ }),
    )
    await expect(args['onUpdate:selected']).toHaveBeenCalledWith(true)
  },
}

/** 選択モードで、選んだ動画。枠がアクセント色になる。 */
export const SelectSelected: Story = {
  args: {
    no: '04',
    file: 'video_04.mp4',
    duration: '02:31',
    fileSize: '590 MB',
    mode: 'select',
    selected: true,
  },
}
