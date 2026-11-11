import { expect, test } from '@playwright/test'
import { env } from '../env'
import { countTicketsByMessageId, deleteTickets, getTicket } from '../support/db'

const url = '/api/inbound/email'
const auth = { 'x-inbound-secret': env.inboundEmailSecret }

let counter = 0
const createdIds: number[] = []
const usedMessageIds: string[] = []
const usedFromEmails: string[] = []

function unique() {
  return `${Date.now()}-${++counter}`
}

function newEmail(overrides: Record<string, unknown> = {}) {
  const id = unique()
  const messageId = `<e2e-${id}@example.com>`
  const from = `Sender-${id}@Example.com`
  usedMessageIds.push(messageId)
  usedFromEmails.push(from.toLowerCase())
  return { from, fromName: 'E2E Sender', subject: `E2E subject ${id}`, text: `E2E body ${id}`, messageId, ...overrides }
}

// Clean up even when assertions fail
test.afterEach(async () => {
  const ids = createdIds.splice(0)
  const messageIds = usedMessageIds.splice(0)
  const emails = usedFromEmails.splice(0)
  await deleteTickets(ids, messageIds, emails)
})

test('a valid email creates an open, uncategorised ticket', async ({ request }) => {
  const data = newEmail()
  const res = await request.post(url, { headers: auth, data })
  expect(res.status()).toBe(201)
  const { id } = await res.json()
  expect(Number.isInteger(id)).toBe(true)
  createdIds.push(id)

  const ticket = await getTicket(id)
  expect(ticket).toMatchObject({
    subject: data.subject,
    body: data.text,
    fromEmail: data.from.toLowerCase(),
    fromName: data.fromName,
    messageId: data.messageId,
    status: 'OPEN',
    category: null,
  })
})

test('the same messageId returns the same ticket and creates no second one', async ({ request }) => {
  const data = newEmail()
  const first = await request.post(url, { headers: auth, data })
  expect(first.status()).toBe(201)
  const { id } = await first.json()
  createdIds.push(id)

  const second = await request.post(url, { headers: auth, data })
  expect(second.status()).toBe(200)
  expect((await second.json()).id).toBe(id)
  expect(await countTicketsByMessageId(data.messageId)).toBe(1)
})

test('a missing secret is rejected with 401 and creates nothing', async ({ request }) => {
  const data = newEmail()
  const res = await request.post(url, { data })
  expect(res.status()).toBe(401)
  expect(await res.json()).toEqual({ error: 'Unauthorized' })
  expect(await countTicketsByMessageId(data.messageId)).toBe(0)
})

test('a wrong secret is rejected with 401 and creates nothing', async ({ request }) => {
  const data = newEmail()
  const res = await request.post(url, { headers: { 'x-inbound-secret': 'definitely-not-the-secret' }, data })
  expect(res.status()).toBe(401)
  expect(await res.json()).toEqual({ error: 'Unauthorized' })
  expect(await countTicketsByMessageId(data.messageId)).toBe(0)
})

test.describe('invalid input returns 400 and creates nothing', () => {
  const cases: Array<[string, string, Record<string, unknown>]> = [
    ['invalid email', 'from', { from: 'not-an-email' }],
    ['missing fromName', 'fromName', { fromName: undefined }],
    ['blank fromName', 'fromName', { fromName: '   ' }],
    ['blank text', 'text', { text: '   ' }],
  ]
  for (const [name, field, override] of cases) {
    test(name, async ({ request }) => {
      const data = newEmail(override)
      const res = await request.post(url, { headers: auth, data })
      expect(res.status()).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Invalid input')
      expect(body.fieldErrors).toHaveProperty(field)
      expect(await countTicketsByMessageId(data.messageId)).toBe(0)
    })
  }
})
