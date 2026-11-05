import { expect, test } from '@playwright/test'
import { testUsers } from '../env'
import { clientOrigin, loginViaApi, loginViaUi } from '../support/auth'

test.describe('client route authorization', () => {
  test('admin can open /users', async ({ page }) => {
    await loginViaUi(page, testUsers.admin)
    await page.goto('/users')
    await expect(page).toHaveURL('/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })

  test('agent visiting /users is redirected to /', async ({ page }) => {
    await loginViaUi(page, testUsers.agent)
    await page.goto('/users')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Welcome to Helpdesk' })).toBeVisible()
  })
})

test.describe('API authorization', () => {
  test('GET /api/health is public', async ({ request }) => {
    const res = await request.get('/api/health')
    expect(res.status()).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok' })
  })

  test('GET /api/me without a cookie returns 401', async ({ request }) => {
    const res = await request.get('/api/me')
    expect(res.status()).toBe(401)
  })

  test('unknown /api routes without a cookie return 401, not 404', async ({ request }) => {
    expect((await request.get('/api/users')).status()).toBe(401)
  })

  for (const [role, user] of [
    ['ADMIN', testUsers.admin],
    ['AGENT', testUsers.agent],
  ] as const) {
    test(`GET /api/me as ${role} returns the user without sensitive fields`, async ({ request }) => {
      await loginViaApi(request, user)
      const res = await request.get('/api/me')
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.email).toBe(user.email.toLowerCase())
      expect(body.role).toBe(role)
      const raw = JSON.stringify(body)
      expect(raw).not.toContain(user.password)
      expect(body).not.toHaveProperty('password')
      expect(body).not.toHaveProperty('passwordHash')
      expect(body).not.toHaveProperty('token')
    })
  }

  test('an agent cannot escalate their role via update-user', async ({ request }) => {
    await loginViaApi(request, testUsers.agent)
    const attempts = [
      { role: 'ADMIN' },
      { role: 'admin' },
      { name: 'Test Agent', role: 'ADMIN' },
    ]
    for (const data of attempts) {
      await request.post('/api/auth/update-user', { data, headers: { Origin: clientOrigin } })
      const me = await (await request.get('/api/me')).json()
      expect(me.role).toBe('AGENT')
    }
  })

  test('an agent cannot escalate their role via other endpoints', async ({ request }) => {
    await loginViaApi(request, testUsers.agent)
    for (const [path, data] of [
      ['/api/auth/admin/set-role', { userId: 'x', role: 'ADMIN' }],
      ['/api/auth/update-user', { role: 'ADMIN', image: null }],
    ] as const) {
      const res = await request.post(path, { data, headers: { Origin: clientOrigin } })
      expect(res.status()).not.toBe(200)
    }
    const me = await (await request.get('/api/me')).json()
    expect(me.role).toBe('AGENT')
  })
})

test.describe('sign-up disabled', () => {
  const newUser = { name: 'Intruder', email: 'intruder@example.com', password: 'Sup3r-secret-pass!' }

  test('POST /api/auth/sign-up/email returns 404 and creates no user', async ({ request }) => {
    const res = await request.post('/api/auth/sign-up/email', {
      data: newUser,
      headers: { Origin: clientOrigin },
    })
    expect(res.status()).toBe(404)

    const login = await request.post('/api/auth/sign-in/email', {
      data: { email: newUser.email, password: newUser.password },
      headers: { Origin: clientOrigin },
    })
    expect(login.status()).toBeGreaterThanOrEqual(400)
    expect((await request.get('/api/me')).status()).toBe(401)
  })

  test('sign-up with a role field is also rejected', async ({ request }) => {
    const res = await request.post('/api/auth/sign-up/email', {
      data: { ...newUser, email: 'intruder2@example.com', role: 'ADMIN' },
      headers: { Origin: clientOrigin },
    })
    expect(res.status()).toBe(404)
  })

  test('the new credentials cannot log in through the UI', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(newUser.email)
    await page.getByLabel('Password').fill(newUser.password)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page).toHaveURL('/login')
  })
})

test.describe('origin / CSRF', () => {
  const evil = 'http://evil.example'

  test('sign-in from an untrusted Origin is rejected', async ({ request }) => {
    const res = await request.post('/api/auth/sign-in/email', {
      data: testUsers.agent,
      headers: { Origin: evil },
    })
    expect(res.status()).toBe(403)
    expect((await request.get('/api/me')).status()).toBe(401)
  })

  test('sign-out from an untrusted Origin is rejected and the session survives', async ({ request }) => {
    await loginViaApi(request, testUsers.agent)
    const res = await request.post('/api/auth/sign-out', { data: {}, headers: { Origin: evil } })
    expect(res.status()).toBe(403)
    expect((await request.get('/api/me')).status()).toBe(200)
  })

  test('sign-in from the trusted Origin is accepted', async ({ request }) => {
    const res = await request.post('/api/auth/sign-in/email', {
      data: testUsers.agent,
      headers: { Origin: clientOrigin },
    })
    expect(res.status()).toBe(200)
  })
})
