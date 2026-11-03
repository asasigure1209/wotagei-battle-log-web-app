// 管理画面にログインする。合言葉 (NUXT_ADMIN_PASSWORD) が合えば、ログインの Cookie を渡す
export default defineEventHandler(async (event) => {
  const adminPassword = configSecret(useRuntimeConfig(event).adminPassword)
  if (!adminPassword) {
    throw createError({
      status: 503,
      statusText: 'Admin Is Disabled',
      message: '管理画面は無効です (NUXT_ADMIN_PASSWORD が設定されていません)',
    })
  }

  const body = await readBody<{ password?: unknown }>(event)
  if (!isValidAdminPassword(body?.password, adminPassword)) {
    // 総当たりを遅らせるため、間違えたときは少し待ってから返す
    await new Promise((resolve) => setTimeout(resolve, 1000))
    throw createError({
      status: 401,
      statusText: 'Unauthorized',
      message: '合言葉が違います',
    })
  }

  setCookie(event, ADMIN_SESSION_COOKIE, createAdminSession(adminPassword), {
    httpOnly: true,
    // localhost の http でも使えるよう、本番 (https) のときだけ secure にする
    secure: getRequestProtocol(event) === 'https',
    // ほかのサイトから管理画面の API を呼ばせない (CSRF)
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_TTL_SEC,
  })
  return { ok: true }
})
