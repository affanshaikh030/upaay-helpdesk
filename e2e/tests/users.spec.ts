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
