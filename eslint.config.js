// ESLint はサイクロマチック複雑度のチェックだけに使う（ほかの lint と整形は Biome）
import tseslint from 'typescript-eslint'
import vueParser from 'vue-eslint-parser'

export default [
  {
    // ESLint は .gitignore を読まないので、生成物を明示的に除外する
    ignores: [
      '.output/',
      '.data/',
      '.nuxt/',
      '.nitro/',
      '.cache/',
      'dist/',
      '.wrangler/',
      'storybook-static/',
      'server/db/migrations/',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
    languageOptions: { parser: tseslint.parser },
  },
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: { parser: tseslint.parser },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    rules: { complexity: ['error', 10] },
  },
]
