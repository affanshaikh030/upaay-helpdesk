import { existsSync } from 'node:fs'
import path from 'node:path'

// Load e2e/.env.test into process.env (real environment variables win, e.g. in CI)
const envFile = path.join(__dirname, '.env.test')
if (existsSync(envFile)) process.loadEnvFile(envFile)

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set. Copy e2e/.env.test.example to e2e/.env.test and fill it in.`)
  return value
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  authSecret: required('BETTER_AUTH_SECRET'),
  serverPort: process.env.E2E_SERVER_PORT ?? '3100',
  clientPort: process.env.E2E_CLIENT_PORT ?? '5183',
}

export const testUsers = {
  admin: { email: required('E2E_ADMIN_EMAIL'), password: required('E2E_ADMIN_PASSWORD') },
  agent: { email: required('E2E_AGENT_EMAIL'), password: required('E2E_AGENT_PASSWORD') },
}
