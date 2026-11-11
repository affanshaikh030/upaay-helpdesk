import type { TicketCategory, TicketStatus } from '@helpdesk/core'
import { Client } from 'pg'
import { env } from '../env'

export interface TicketRow {
  id: number
  subject: string
  body: string
  fromEmail: string
  fromName: string
  messageId: string | null
  status: TicketStatus
  category: TicketCategory | null
}

// Connection-string parameters that can redirect the connection to another server, bypassing the
// host check below (e.g. ?host=...). Harmless ones such as ?schema=public are allowed
const REDIRECTING_PARAMS = ['host', 'hostaddr', 'port', 'service', 'options']

// Run a callback with a connected pg client. Refuses any database not named *_test on localhost
// (mirrors the guard in server/prisma/e2e-setup.ts). The client is always closed.
async function withClient<T>(fn: (client: Client) => Promise<T>): Promise<T> {
  const url = new URL(env.databaseUrl)
  const dbName = url.pathname.replace(/^\//, '')
  if (!dbName.endsWith('_test') || !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new Error(`Refusing to touch "${dbName}" on ${url.hostname}: must be a local database named *_test`)
  }
  const redirecting = [...url.searchParams.keys()].filter((key) => REDIRECTING_PARAMS.includes(key.toLowerCase()))
  if (redirecting.length > 0) {
    throw new Error(
      `Refusing to touch "${dbName}": DATABASE_URL must not set ${redirecting.join(', ')} (they can override the host checked above)`,
    )
  }
  const client = new Client({ connectionString: env.databaseUrl })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

const columns = `id, subject, body, "fromEmail", "fromName", "messageId", status::text AS status, category::text AS category`

export function getTicket(id: number): Promise<TicketRow | undefined> {
  return withClient(async (c) => (await c.query(`SELECT ${columns} FROM "ticket" WHERE id = $1`, [id])).rows[0])
}

export function countTicketsByMessageId(messageId: string): Promise<number> {
  return withClient(
    async (c) => Number((await c.query(`SELECT count(*) FROM "ticket" WHERE "messageId" = $1`, [messageId])).rows[0].count),
  )
}

export function countTicketsByFromEmail(fromEmail: string): Promise<number> {
  return withClient(
    async (c) => Number((await c.query(`SELECT count(*) FROM "ticket" WHERE "fromEmail" = $1`, [fromEmail])).rows[0].count),
  )
}

export function deleteTickets(ids: number[], messageIds: string[] = [], fromEmails: string[] = []): Promise<void> {
  if (ids.length === 0 && messageIds.length === 0 && fromEmails.length === 0) return Promise.resolve()
  return withClient(async (c) => {
    await c.query(
      `DELETE FROM "ticket" WHERE id = ANY($1::int[]) OR "messageId" = ANY($2::text[]) OR "fromEmail" = ANY($3::text[])`,
      [ids, messageIds, fromEmails],
    )
  })
}
