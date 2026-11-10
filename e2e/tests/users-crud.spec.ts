import { expect, test, type APIRequestContext, type Browser, type Page } from '@playwright/test'
import { testUsers } from '../env'
import { loginViaApi, loginViaUi } from '../support/auth'

const password = 'Passw0rd-initial'
const newPassword = 'Passw0rd-changed'

let seq = 0
function uniqueUser(label: string) {
  const id = `${Date.now()}-${seq++}`
  return { name: `E2E ${label} ${id}`, email: `e2e-${label}-${id}@example.com`.toLowerCase(), password }
}

type Creds = { email: string; password: string }

async function createUserViaUi(page: Page, user: { name: string; email: string; password: string }) {
  await page.getByRole('button', { name: 'New user' }).click()
  const dialog = page.getByRole('dialog', { name: 'New user' })
  await dialog.getByLabel('Name').fill(user.name)
  await dialog.getByLabel('Email').fill(user.email)
  await dialog.getByLabel('Password').fill(user.password)
  await dialog.getByRole('button', { name: 'Create user' }).click()
  await expect(dialog).toBeHidden()
}

const rowFor = (page: Page, text: string) => page.getByRole('row').filter({ hasText: text })

// Signs in as `user` in a brand-new browser context and returns the page after the attempt
async function tryLogin(browser: Browser, baseURL: string | undefined, user: Creds) {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  return { page, close: () => context.close() }
}

async function expectCanSignIn(browser: Browser, baseURL: string | undefined, user: Creds) {
  const { page, close } = await tryLogin(browser, baseURL, user)
  await expect(page).toHaveURL('/')
  await close()
}

async function expectCannotSignIn(browser: Browser, baseURL: string | undefined, user: Creds) {
  const { page, close } = await tryLogin(browser, baseURL, user)
  // Same message as a wrong password, so a deleted account isn't revealed
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password')
  await expect(page).toHaveURL('/login')
  await close()
}

// Keeps the shared database tidy for other specs: soft-deletes the users a test created
async function cleanup(request: APIRequestContext, emails: string[]) {
  await loginViaApi(request, testUsers.admin)
  const users: { id: string; email: string }[] = await (await request.get('/api/users')).json()
  for (const user of users.filter((u) => emails.includes(u.email))) {
    await request.delete(`/api/users/${user.id}`)
  }
}

test.describe('user management as admin', () => {
  let created: string[]

  test.beforeEach(async ({ page }) => {
    created = []
    await loginViaUi(page, testUsers.admin)
    await page.goto('/users')
    await expect(page.getByRole('table')).toBeVisible()
  })

  test.afterEach(async ({ request }) => {
    await cleanup(request, created)
  })

  test('read: lists users in a table with an Agent badge and a user count', async ({ page }) => {
    await expect(page.getByRole('row', { name: /Test Admin/ }).getByRole('cell').nth(2)).toHaveText('Admin')
    await expect(page.getByRole('row', { name: /Test Agent/ }).getByRole('cell').nth(2)).toHaveText('Agent')
    await expect(page.getByText(/^\d+ users?$/)).toBeVisible()
  })

  test('create: a new user appears in the table as an Agent and can sign in', async ({ page, browser, baseURL }) => {
    const user = uniqueUser('create')
    created.push(user.email)

    await createUserViaUi(page, user)

    const row = rowFor(page, user.email)
    await expect(row).toBeVisible()
    await expect(row.getByRole('cell').nth(0)).toHaveText(user.name)
    await expect(row.getByRole('cell').nth(2)).toHaveText('Agent')

    await expectCanSignIn(browser, baseURL, user)
  })

  test('update: editing name and email with a blank password keeps the old password', async ({ page, browser, baseURL }) => {
    const user = uniqueUser('edit')
    const edited = uniqueUser('edited')
    created.push(user.email, edited.email)
    await createUserViaUi(page, user)

    await page.getByRole('button', { name: `Edit ${user.name}` }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit user' })
    await expect(dialog.getByLabel('Name')).toHaveValue(user.name)
    await expect(dialog.getByLabel('Email')).toHaveValue(user.email)
    await expect(dialog.getByLabel('Password')).toHaveValue('')
    await expect(dialog.getByText('Leave blank to keep the current password')).toBeVisible()

    await dialog.getByLabel('Name').fill(edited.name)
    await dialog.getByLabel('Email').fill(edited.email)
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()

    const row = rowFor(page, edited.email)
    await expect(row.getByRole('cell').nth(0)).toHaveText(edited.name)
    await expect(rowFor(page, user.email)).toHaveCount(0)

    await expectCanSignIn(browser, baseURL, { email: edited.email, password })
  })

  test('update: setting a new password lets the user sign in with it', async ({ page, browser, baseURL }) => {
    const user = uniqueUser('pwd')
    created.push(user.email)
    await createUserViaUi(page, user)

    await page.getByRole('button', { name: `Edit ${user.name}` }).click()
    const dialog = page.getByRole('dialog', { name: 'Edit user' })
    await dialog.getByLabel('Password').fill(newPassword)
    await dialog.getByRole('button', { name: 'Save changes' }).click()
    await expect(dialog).toBeHidden()

    await expectCanSignIn(browser, baseURL, { email: user.email, password: newPassword })
    await expectCannotSignIn(browser, baseURL, { email: user.email, password })
  })

  test('delete: the user disappears from the table and can no longer sign in', async ({ page, browser, baseURL }) => {
    const user = uniqueUser('delete')
    created.push(user.email)
    await createUserViaUi(page, user)
    await expect(rowFor(page, user.email)).toBeVisible()

    await expect(page.getByRole('button', { name: 'Delete Test Admin' })).toHaveCount(0)

    await page.getByRole('button', { name: `Delete ${user.name}` }).click()
    const dialog = page.getByRole('dialog', { name: 'Delete user' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(dialog).toBeHidden()

    await expect(rowFor(page, user.email)).toHaveCount(0)
    await expectCannotSignIn(browser, baseURL, user)
  })

  test('delete: cancelling keeps the user', async ({ page }) => {
    const user = uniqueUser('cancel')
    created.push(user.email)
    await createUserViaUi(page, user)

    await page.getByRole('button', { name: `Delete ${user.name}` }).click()
    const dialog = page.getByRole('dialog', { name: 'Delete user' })
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toBeHidden()
    await expect(rowFor(page, user.email)).toBeVisible()
  })
})
