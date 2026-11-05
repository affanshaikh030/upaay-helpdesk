import { defineConfig, devices } from '@playwright/test'
import { env } from './e2e/env'

const serverUrl = `http://localhost:${env.serverPort}`
const clientUrl = `http://localhost:${env.clientPort}`

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false, // all tests share one database
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: clientUrl,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      name: 'API',
      // Resets and seeds the _test database before the server starts listening
      command: 'bun run test:db && bun src/index.ts',
      cwd: './server',
      url: `${serverUrl}/api/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'test',
        PORT: env.serverPort,
        DATABASE_URL: env.databaseUrl,
        BETTER_AUTH_SECRET: env.authSecret,
        BETTER_AUTH_URL: serverUrl,
        TRUSTED_ORIGINS: clientUrl,
        E2E_ADMIN_EMAIL: process.env.E2E_ADMIN_EMAIL!,
        E2E_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD!,
        E2E_AGENT_EMAIL: process.env.E2E_AGENT_EMAIL!,
        E2E_AGENT_PASSWORD: process.env.E2E_AGENT_PASSWORD!,
      },
    },
    {
      name: 'Client',
      command: `bun run dev -- --port ${env.clientPort} --strictPort`,
      cwd: './client',
      url: clientUrl,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { API_PROXY_TARGET: serverUrl },
    },
  ],
})
