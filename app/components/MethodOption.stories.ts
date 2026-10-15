import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { useArgs } from 'storybook/preview-api'
import { expect, fn } from 'storybook/test'
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
  // v-model で受け取った値を args に戻し、親で v-model を使ったときと同じように動かす。
  // ラジオのグループは form ごとに分かれるので、docs で同じ name のストーリーが並んでも干渉しないよう form で囲む
  render: (args) => {
    const [, updateArgs] = useArgs()
    return {
      components: { MethodOption },
      setup: () => ({ args, updateArgs }),
      template:
        '<form><MethodOption v-bind="args" @update:model-value="(modelValue) => updateArgs({ modelValue })" /></form>',
    }
  },
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
