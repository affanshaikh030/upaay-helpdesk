import { expect, test } from '@playwright/test'
import { testUsers } from '../env'
import { clientOrigin, loginViaApi, loginViaUi } from '../support/auth'

test.describe('unauthenticated access', () => {
  for (const path of ['/', '/users']) {
    test(`${path} redirects to /login`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL('/login')
      await expect(page.getByText('Sign in to Upaay')).toBeVisible()
    })
  }
})

test.describe('session', () => {
  test('persists across a reload', async ({ page }) => {
    await loginViaUi(page, testUsers.agent)
    await page.reload()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('navigation').getByText('Test Agent')).toBeVisible()
  })

  test('sign out clears the session; back and reload do not restore access', async ({ page }) => {
    await loginViaUi(page, testUsers.agent)
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL('/login')

    await page.goBack()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText('Sign in to Upaay')).toBeVisible()

    await page.goto('/')
    await expect(page).toHaveURL('/login')
    await page.reload()
    await expect(page).toHaveURL('/login')

    const me = await page.request.get('/api/me')
    expect(me.status()).toBe(401)
  })

  test('sign out invalidates the session cookie for protected API calls', async ({ page, browser }) => {
    await loginViaUi(page, testUsers.agent)
    const cookies = await page.context().cookies()

    // A second context holding a copy of the same session cookie
    const other = await browser.newContext()
    await other.addCookies(cookies)
    expect((await other.request.get('/api/me')).status()).toBe(200)

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL('/login')

    // The session was deleted server-side, so the copied cookie no longer works
    expect((await other.request.get('/api/me')).status()).toBe(401)
    await other.close()
  })

  test('API sign-out ends the session', async ({ request }) => {
    await loginViaApi(request, testUsers.agent)
    expect((await request.get('/api/me')).status()).toBe(200)
    const out = await request.post('/api/auth/sign-out', {
      headers: { Origin: clientOrigin },
      data: {},
    })
    expect(out.status()).toBe(200)
    expect((await request.get('/api/me')).status()).toBe(401)
  })

  test('garbage session cookie is treated as logged out', async ({ page, context }) => {
    await context.addCookies([
      { name: 'better-auth.session_token', value: 'garbage.value', url: clientOrigin },
    ])
    await page.goto('/')
    await expect(page).toHaveURL('/login')
    expect((await page.request.get('/api/me')).status()).toBe(401)
  })

  test('tampered session cookie is treated as logged out', async ({ page, context }) => {
    await loginViaUi(page, testUsers.agent)
    const cookie = (await context.cookies()).find((c) => c.name.endsWith('session_token'))!
    expect(cookie).toBeTruthy()

    // Flip the signature part (after the last dot) while keeping the token
    const decoded = decodeURIComponent(cookie.value)
    const dot = decoded.lastIndexOf('.')
    const sig = decoded.slice(dot + 1)
    const forged = decoded.slice(0, dot + 1) + (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1)
    await context.clearCookies({ name: cookie.name })
    await context.addCookies([{ ...cookie, value: encodeURIComponent(forged) }])

    expect((await page.request.get('/api/me')).status()).toBe(401)
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })
})
