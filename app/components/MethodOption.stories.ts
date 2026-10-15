import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn } from 'storybook/test'
import { ref, watch } from 'vue'
import MethodOption from './MethodOption.vue'

/**
 * まとめてダウンロードするときの、保存のしかたの選択肢 (ラジオボタン)。
 *
 * - 同じグループの選択肢には同じ `name` を付け、選ばれている値を `v-model` でやり取りする
 * - 選ばれている選択肢は枠がアクセント色になる
 */
const meta = {
  component: MethodOption,
  tags: ['autodocs'],
  args: {
    method: 'zip',
    name: 'method',
    modelValue: 'zip',
    'onUpdate:modelValue': fn(),
  },
  // 選ばれている値はストーリーの中で持ち、親で v-model を使ったときと同じように動かす。
  // args に書き戻すと、play 関数の途中で Storybook が描画し直し、そのときに fn() の呼び出しの記録が消えてしまう
  // ラジオのグループは form ごとに分かれるので、docs で同じ name のストーリーが並んでも干渉しないよう form で囲む
  render: (args) => ({
    components: { MethodOption },
    setup() {
      const model = ref(args.modelValue)
      // Controls で変えた値は反映する
      watch(
        () => args.modelValue,
        (value) => {
          model.value = value
        },
      )
      return { args, model }
    },
    template: '<form><MethodOption v-bind="args" v-model="model" /></form>',
  }),
} satisfies Meta<typeof MethodOption>

export default meta
type Story = StoryObj<typeof meta>

/** ZIP にまとめる選択肢が選ばれている。 */
export const Zip: Story = {}

/** 1 本ずつ保存する選択肢が選ばれていない。選ぶと `update:modelValue` が `'seq'` で発火し、枠がアクセント色になる。 */
export const Seq: Story = {
  args: { method: 'seq' },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('radio', { name: /1本ずつ続けて保存/ }),
    )
    await expect(args['onUpdate:modelValue']).toHaveBeenCalledWith('seq')
  },
}
