// 管理画面の親のページ (pages/admin.vue) がログインを確かめ、配下のページにはログインが切れたときの扱いを渡す
import { type InjectionKey, inject, provide } from 'vue'

const unauthorizedKey: InjectionKey<() => void> = Symbol('adminUnauthorized')

/** 配下のページに、ログインが切れたときに呼ぶ関数を渡す */
export function provideAdminUnauthorized(onUnauthorized: () => void) {
  provide(unauthorizedKey, onUnauthorized)
}

/** ログインが切れたときに呼ぶ関数 (親のページがログインの画面に戻す) */
export function useAdminUnauthorized() {
  return inject(unauthorizedKey, () => {})
}
