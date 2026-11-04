// 管理画面にログインしているか。親のページ (pages/admin.vue) が確かめ、子のページはログインが切れたら false にする

/** ログインしているか。確かめるまでは null */
export function useAdminLoggedIn() {
  return useState<boolean | null>('admin-logged-in', () => null)
}
