import { expect, test } from '@playwright/test'
import { testUsers } from '../env'
import { loginViaApi, loginViaUi } from '../support/auth'

const admin = { name: 'Test Admin', email: testUsers.admin.email.toLowerCase(), role: 'Admin' }
const agent = { name: 'Test Agent', email: testUsers.agent.email.toLowerCase(), role: 'Agent' }

test.describe('users page as admin', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, testUsers.admin)
  })

  test('navbar Users link opens /users', async ({ page }) => {
    await page.getByRole('navigation').getByRole('link', { name: 'Users' }).click()
    await expect(page).toHaveURL('/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })

  test('shows the table with both seeded users, admin first', async ({ page }) => {
    await page.goto('/users')
    await expect(page.getByText('2 users')).toBeVisible()

    for (const header of ['Name', 'Email', 'Role', 'Created']) {
      await expect(page.getByRole('columnheader', { name: header })).toBeVisible()
    }

    const rows = page.getByRole('row')
    await expect(rows).toHaveCount(3) // header + 2 users
    for (const [index, user] of [admin, agent].entries()) {
      const row = rows.nth(index + 1)
      const cells = row.getByRole('cell')
      await expect(cells.nth(0)).toHaveText(user.name)
      await expect(cells.nth(1)).toHaveText(user.email)
      await expect(cells.nth(2)).toHaveText(user.role)
      await expect(cells.nth(3)).toHaveText(/\d{4}/) // formatted date with a year
      await expect(cells.nth(3)).toHaveText(/[A-Za-z]{3,}\.? \d{1,2}, \d{4}/)
    }
  })

  test('never shows password or hash text', async ({ page }) => {
    await page.goto('/users')
    await expect(page.getByText('2 users')).toBeVisible()
    const text = (await page.locator('main').innerText()).toLowerCase()
    expect(text).not.toContain(testUsers.admin.password.toLowerCase())
    expect(text).not.toContain(testUsers.agent.password.toLowerCase())
    expect(text).not.toContain('password')
    expect(text).not.toContain('hash')
  })
})

test.describe('users page as agent', () => {
  test('has no Users link and /users redirects to /', async ({ page }) => {
    await loginViaUi(page, testUsers.agent)
    await expect(page.getByRole('navigation')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)

    await page.goto('/users')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('table')).toHaveCount(0)
    await expect(page.getByText('No users found.')).toHaveCount(0)
    await expect(page.getByText(admin.email)).toHaveCount(0)
  })
})

test.describe('users page logged out', () => {
  test('/users redirects to /login', async ({ page }) => {
    await page.goto('/users')
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('table')).toHaveCount(0)
  })
})

test.describe('users page states', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, testUsers.admin)
  })

  test('shows a loading state while the request is pending', async ({ page }) => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/api/users', async (route) => {
      await gate
      await route.continue()
    })

    await page.goto('/users')
    await expect(page.getByRole('status', { name: 'Loading users' })).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)

    release()
    await expect(page.getByRole('status', { name: 'Loading users' })).toBeHidden()
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('shows an error alert when the request fails with 500', async ({ page }) => {
    await page.route('**/api/users', (route) =>
      route.fulfill({ status: 500, json: { error: 'boom' } }),
    )
    await page.goto('/users')
    await expect(page.getByRole('alert')).toHaveText('Failed to load users')
    await expect(page.getByRole('table')).toHaveCount(0)
  })

  test('shows an access message when the API returns 403', async ({ page }) => {
    await page.route('**/api/users', (route) =>
      route.fulfill({ status: 403, json: { error: 'Forbidden' } }),
    )
    await page.goto('/users')
    await expect(page.getByRole('alert')).toHaveText('You do not have access to this page')
    await expect(page.getByRole('table')).toHaveCount(0)
  })

  test('shows an empty state for an empty list', async ({ page }) => {
    await page.route('**/api/users', (route) => route.fulfill({ status: 200, json: [] }))
    await page.goto('/users')
    await expect(page.getByText('No users found.')).toBeVisible()
    await expect(page.getByText('0 users')).toBeVisible()
    await expect(page.getByRole('table')).toHaveCount(0)
  })
})

test.describe('GET /api/users', () => {
  test('as admin returns exactly the seeded users with only safe fields', async ({ request }) => {
    await loginViaApi(request, testUsers.admin)
    const res = await request.get('/api/users')
    expect(res.status()).toBe(200)

    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(2)
    expect(body.map((u: { email: string }) => u.email)).toEqual([admin.email, agent.email])
    expect(body.map((u: { role: string }) => u.role)).toEqual(['ADMIN', 'AGENT'])
    expect(body.map((u: { name: string }) => u.name)).toEqual([admin.name, agent.name])

    for (const user of body) {
      expect(Object.keys(user).sort()).toEqual(['createdAt', 'email', 'id', 'name', 'role'])
      expect(Number.isNaN(Date.parse(user.createdAt))).toBe(false)
    }
    const raw = JSON.stringify(body)
    expect(raw).not.toContain(testUsers.admin.password)
    expect(raw).not.toContain(testUsers.agent.password)
    expect(raw).not.toMatch(/password|account|session|token/i)
  })

  test('as agent returns 403 Forbidden', async ({ request }) => {
    await loginViaApi(request, testUsers.agent)
    const res = await request.get('/api/users')
    expect(res.status()).toBe(403)
    expect(await res.json()).toEqual({ error: 'Forbidden' })
  })

  test('without a cookie returns 401', async ({ request }) => {
    const res = await request.get('/api/users')
    expect(res.status()).toBe(401)
  })

  // These methods have no route on the collection URL (PATCH and DELETE need an id)
  for (const method of ['put', 'patch', 'delete'] as const) {
    test(`${method.toUpperCase()} /api/users is not available to an admin`, async ({ request }) => {
      await loginViaApi(request, testUsers.admin)
      const res = await request[method]('/api/users', {
        data: { name: 'Eve', email: 'eve@example.com', role: 'ADMIN' },
      })
      expect(res.status()).toBe(404)

      const list = await (await request.get('/api/users')).json()
      expect(list).toHaveLength(2)
    })
  }

  test('POST /api/users with an invalid body returns 400 and creates nothing', async ({ request }) => {
    await loginViaApi(request, testUsers.admin)
    const res = await request.post('/api/users', {
      data: { name: 'Eve', email: 'eve@example.com', role: 'ADMIN' }, // no password
    })
    expect(res.status()).toBe(400)
    expect(Object.keys((await res.json()).fieldErrors)).toEqual(['password'])

    const list = await (await request.get('/api/users')).json()
    expect(list).toHaveLength(2)
  })

  test('POST /api/users ignores a role in the body and creates an agent', async ({ request }) => {
    await loginViaApi(request, testUsers.admin)
    const email = `role-check-${Date.now()}@example.com`
    const res = await request.post('/api/users', {
      data: { name: 'Role Check', email, password: 'password12345', role: 'ADMIN' },
    })
    expect(res.status()).toBe(201)
    const created = await res.json()
    expect(created.role).toBe('AGENT')

    // Soft-delete it again so other tests still see exactly the seeded users
    expect((await request.delete(`/api/users/${created.id}`)).status()).toBe(204)
  })

  test('POST, PATCH and DELETE /api/users are forbidden for an agent', async ({ request }) => {
    await loginViaApi(request, testUsers.agent)
    const body = { name: 'Eve', email: 'eve@example.com', password: 'password12345' }
    expect((await request.post('/api/users', { data: body })).status()).toBe(403)
    expect((await request.patch('/api/users/some-id', { data: body })).status()).toBe(403)
    expect((await request.delete('/api/users/some-id')).status()).toBe(403)
  })
})
