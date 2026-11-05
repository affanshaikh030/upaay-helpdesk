import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { env } from '../env'

export const clientOrigin = `http://localhost:${env.clientPort}`

type Credentials = { email: string; password: string }

export async function loginViaUi(page: Page, user: Credentials) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/')
}

// Signs in through the API; the cookie is stored on the given request context
export async function loginViaApi(request: APIRequestContext, user: Credentials) {
  const res = await request.post('/api/auth/sign-in/email', {
    data: user,
    headers: { Origin: clientOrigin },
  })
  expect(res.status()).toBe(200)
}
