import { expect, test } from '@playwright/test'
import { testUsers } from '../env'
import { loginViaUi } from '../support/auth'

const GENERIC_ERROR = /invalid email or password/i

test.describe('login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  const email = (page: import('@playwright/test').Page) => page.getByLabel('Email')
  const password = (page: import('@playwright/test').Page) => page.getByLabel('Password', { exact: true })
  const submit = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /sign in|signing in/i })

  test('renders the form', async ({ page }) => {
    await expect(page.getByText('Sign in to Upaay')).toBeVisible()
    await expect(email(page)).toBeVisible()
    await expect(submit(page)).toBeEnabled()
  })

  for (const [role, user, name] of [
    ['admin', testUsers.admin, 'Test Admin'],
    ['agent', testUsers.agent, 'Test Agent'],
  ] as const) {
    test(`${role} can sign in and sees their name`, async ({ page }) => {
      await loginViaUi(page, user)
      await expect(page.getByRole('navigation').getByText(name)).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    })
  }

  test('password field is masked', async ({ page }) => {
    await expect(password(page)).toHaveAttribute('type', 'password')
  })

  test('pressing Enter submits the form', async ({ page }) => {
    await email(page).fill(testUsers.agent.email)
    await password(page).fill(testUsers.agent.password)
    await password(page).press('Enter')
    await expect(page).toHaveURL('/')
  })

  test.describe('client-side validation', () => {
    test('both empty', async ({ page }) => {
      await submit(page).click()
      await expect(page.getByText('Email is required')).toBeVisible()
      await expect(page.getByText('Password is required')).toBeVisible()
      await expect(email(page)).toHaveAttribute('aria-invalid', 'true')
      await expect(password(page)).toHaveAttribute('aria-invalid', 'true')
      await expect(page).toHaveURL('/login')
    })

    test('empty email only', async ({ page }) => {
      await password(page).fill('whatever')
      await submit(page).click()
      await expect(page.getByText('Email is required')).toBeVisible()
      await expect(page.getByText('Password is required')).toHaveCount(0)
      await expect(email(page)).toHaveAttribute('aria-invalid', 'true')
      await expect(password(page)).toHaveAttribute('aria-invalid', 'false')
    })

    test('whitespace-only email counts as empty', async ({ page }) => {
      await email(page).fill('   ')
      await password(page).fill('whatever')
      await submit(page).click()
      await expect(page.getByText('Email is required')).toBeVisible()
    })

    test('empty password only', async ({ page }) => {
      await email(page).fill(testUsers.agent.email)
      await submit(page).click()
      await expect(page.getByText('Password is required')).toBeVisible()
      await expect(page.getByText('Email is required')).toHaveCount(0)
      await expect(password(page)).toHaveAttribute('aria-invalid', 'true')
      await expect(email(page)).toHaveAttribute('aria-invalid', 'false')
    })

    for (const bad of ['not-an-email', 'a@b', 'a b@c.com', '@example.com']) {
      test(`malformed email "${bad}"`, async ({ page }) => {
        await email(page).fill(bad)
        await password(page).fill('whatever')
        await submit(page).click()
        await expect(page.getByText('Enter a valid email address')).toBeVisible()
        await expect(email(page)).toHaveAttribute('aria-invalid', 'true')
      })
    }

    test('errors clear when typing in the field', async ({ page }) => {
      await submit(page).click()
      await expect(page.getByText('Email is required')).toBeVisible()
      await expect(page.getByText('Password is required')).toBeVisible()

      await email(page).fill('a')
      await expect(page.getByText('Email is required')).toHaveCount(0)
      await expect(email(page)).toHaveAttribute('aria-invalid', 'false')
      // the other field's error stays until it is edited
      await expect(page.getByText('Password is required')).toBeVisible()

      await password(page).fill('x')
      await expect(page.getByText('Password is required')).toHaveCount(0)
      await expect(password(page)).toHaveAttribute('aria-invalid', 'false')
    })

    test('no network request is sent when validation fails', async ({ page }) => {
      const requests: string[] = []
      page.on('request', (req) => {
        if (req.url().includes('/api/auth/sign-in')) requests.push(req.url())
      })
      await submit(page).click()
      await email(page).fill('bad')
      await password(page).fill('x')
      await submit(page).click()
      await expect(page.getByText('Enter a valid email address')).toBeVisible()
      expect(requests).toHaveLength(0)
    })
  })

  test.describe('invalid credentials', () => {
    async function expectFailed(page: import('@playwright/test').Page) {
      const alert = page.getByRole('alert')
      await expect(alert).toBeVisible()
      await expect(email(page)).toHaveAttribute('aria-invalid', 'true')
      await expect(password(page)).toHaveAttribute('aria-invalid', 'true')
      await expect(page).toHaveURL('/login')
      return (await alert.textContent())?.trim() ?? ''
    }

    test('wrong password and unknown email show the same generic message', async ({ page }) => {
      await email(page).fill(testUsers.agent.email)
      await password(page).fill('definitely-wrong-password')
      await submit(page).click()
      const wrongPassword = await expectFailed(page)
      expect(wrongPassword).toMatch(GENERIC_ERROR)

      await page.reload()
      await email(page).fill('nobody-here@example.com')
      await password(page).fill('definitely-wrong-password')
      await submit(page).click()
      const unknownEmail = await expectFailed(page)

      expect(unknownEmail).toBe(wrongPassword)
    })

    test('flagged fields clear when typing, but the alert stays', async ({ page }) => {
      await email(page).fill(testUsers.agent.email)
      await password(page).fill('wrong-password')
      await submit(page).click()
      await expectFailed(page)
      await password(page).fill('wrong-password-2')
      await expect(password(page)).toHaveAttribute('aria-invalid', 'false')
      await expect(email(page)).toHaveAttribute('aria-invalid', 'true')
    })

    test('a correct retry after a failure signs in', async ({ page }) => {
      await email(page).fill(testUsers.agent.email)
      await password(page).fill('wrong-password')
      await submit(page).click()
      await expectFailed(page)
      await password(page).fill(testUsers.agent.password)
      await submit(page).click()
      await expect(page).toHaveURL('/')
    })

    test('password is case-sensitive', async ({ page }) => {
      await email(page).fill(testUsers.agent.email)
      await password(page).fill(testUsers.agent.password.toUpperCase() + 'x')
      await submit(page).click()
      await expectFailed(page)
    })
  })

  test('email is trimmed before sending', async ({ page }) => {
    await email(page).fill(`  ${testUsers.agent.email}  `)
    await password(page).fill(testUsers.agent.password)
    await submit(page).click()
    await expect(page).toHaveURL('/')
  })

  test('email is case-insensitive', async ({ page }) => {
    await email(page).fill(testUsers.agent.email.toUpperCase())
    await password(page).fill(testUsers.agent.password)
    await submit(page).click()
    await expect(page).toHaveURL('/')
  })

  test('submit is disabled and shows "Signing in…" while pending', async ({ page }) => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => (release = resolve))
    await page.route('**/api/auth/sign-in/email', async (route) => {
      await gate
      await route.continue()
    })

    await email(page).fill(testUsers.agent.email)
    await password(page).fill(testUsers.agent.password)
    await submit(page).click()

    const pending = page.getByRole('button', { name: 'Signing in…' })
    await expect(pending).toBeVisible()
    await expect(pending).toBeDisabled()

    release()
    await expect(page).toHaveURL('/')
  })

  test('already logged-in user visiting /login is redirected to /', async ({ page }) => {
    await loginViaUi(page, testUsers.agent)
    await page.goto('/login')
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  })
})
