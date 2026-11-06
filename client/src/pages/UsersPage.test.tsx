import axios, { AxiosError, type AxiosResponse } from 'axios'
import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithQuery } from '@/test/render'
import type { User } from '@/hooks/use-users'
import UsersPage from './UsersPage'

const admin: User = {
  id: '1',
  name: 'Test Admin',
  email: 'admin@test.local',
  role: 'ADMIN',
  createdAt: '2026-01-15T10:00:00.000Z',
}
const agent: User = {
  id: '2',
  name: 'Test Agent',
  email: 'agent@test.local',
  role: 'AGENT',
  createdAt: '2026-03-20T10:00:00.000Z',
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso))

const mockGet = () => vi.spyOn(axios, 'get')

function httpError(status: number) {
  const response = { status, data: {} } as AxiosResponse
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_RESPONSE', undefined, undefined, response)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('UsersPage', () => {
  describe('loading', () => {
    it('shows skeletons in a status region while the request is pending', () => {
      mockGet().mockReturnValue(new Promise(() => {}))
      renderWithQuery(<UsersPage />)

      const status = screen.getByRole('status', { name: 'Loading users' })
      expect(status.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByText('Loading users…')).not.toBeInTheDocument()
    })

    it('shows the heading and a generic description while loading', () => {
      mockGet().mockReturnValue(new Promise(() => {}))
      renderWithQuery(<UsersPage />)

      expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument()
      expect(screen.getByText('Admins and agents with access to Helpdesk')).toBeInTheDocument()
    })

    it('replaces the skeletons with the table once loaded', async () => {
      mockGet().mockResolvedValue({ data: [admin] })
      renderWithQuery(<UsersPage />)

      expect(await screen.findByRole('table')).toBeInTheDocument()
      expect(screen.queryByRole('status', { name: 'Loading users' })).not.toBeInTheDocument()
    })
  })

  describe('request', () => {
    it('requests /api/users once, with an abort signal', async () => {
      const get = mockGet().mockResolvedValue({ data: [admin] })
      renderWithQuery(<UsersPage />)
      await screen.findByRole('table')

      expect(get).toHaveBeenCalledTimes(1)
      expect(get).toHaveBeenCalledWith('/api/users', { signal: expect.any(AbortSignal) })
    })
  })

  describe('with users', () => {
    it('renders the column headers', async () => {
      mockGet().mockResolvedValue({ data: [admin, agent] })
      renderWithQuery(<UsersPage />)
      await screen.findByRole('table')

      const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
      expect(headers).toEqual(['Name', 'Email', 'Role', 'Created'])
    })

    it('renders one row per user, in the order returned, with name, email, role and date', async () => {
      mockGet().mockResolvedValue({ data: [admin, agent] })
      renderWithQuery(<UsersPage />)
      await screen.findByRole('table')

      const rows = screen.getAllByRole('row').slice(1) // skip the header row
      expect(rows).toHaveLength(2)

      const [adminRow, agentRow] = rows.map((row) => within(row))
      expect(adminRow.getByText('Test Admin')).toBeInTheDocument()
      expect(adminRow.getByText('admin@test.local')).toBeInTheDocument()
      expect(adminRow.getByText('Admin')).toBeInTheDocument()
      expect(adminRow.getByText(formatDate(admin.createdAt))).toBeInTheDocument()

      expect(agentRow.getByText('Test Agent')).toBeInTheDocument()
      expect(agentRow.getByText('agent@test.local')).toBeInTheDocument()
      expect(agentRow.getByText('Agent')).toBeInTheDocument()
      expect(agentRow.getByText(formatDate(agent.createdAt))).toBeInTheDocument()
    })

    it('labels roles as Admin and Agent, not the raw enum values', async () => {
      mockGet().mockResolvedValue({ data: [admin, agent] })
      renderWithQuery(<UsersPage />)
      await screen.findByRole('table')

      expect(screen.queryByText('ADMIN')).not.toBeInTheDocument()
      expect(screen.queryByText('AGENT')).not.toBeInTheDocument()
    })

    it('shows a plural count for several users', async () => {
      mockGet().mockResolvedValue({ data: [admin, agent] })
      renderWithQuery(<UsersPage />)

      expect(await screen.findByText('2 users')).toBeInTheDocument()
    })

    it('shows a singular count for one user', async () => {
      mockGet().mockResolvedValue({ data: [admin] })
      renderWithQuery(<UsersPage />)

      expect(await screen.findByText('1 user')).toBeInTheDocument()
      expect(screen.queryByText('1 users')).not.toBeInTheDocument()
    })

    it('never renders password-like text', async () => {
      mockGet().mockResolvedValue({ data: [admin] })
      renderWithQuery(<UsersPage />)
      await screen.findByRole('table')

      expect(screen.queryByText(/password|hash|token/i)).not.toBeInTheDocument()
    })
  })

  describe('empty list', () => {
    it('shows an empty message and a zero count, with no table', async () => {
      mockGet().mockResolvedValue({ data: [] })
      renderWithQuery(<UsersPage />)

      expect(await screen.findByText('No users found.')).toBeInTheDocument()
      expect(screen.getByText('0 users')).toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })
  })

  describe('errors', () => {
    it('shows an access message when the API returns 403', async () => {
      mockGet().mockRejectedValue(httpError(403))
      renderWithQuery(<UsersPage />)

      expect(await screen.findByRole('alert')).toHaveTextContent('You do not have access to this page')
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
      expect(screen.queryByRole('status', { name: 'Loading users' })).not.toBeInTheDocument()
    })

    it('shows a generic message when the API returns 500', async () => {
      mockGet().mockRejectedValue(httpError(500))
      renderWithQuery(<UsersPage />)

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load users')
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('shows a generic message when the API returns 401', async () => {
      mockGet().mockRejectedValue(httpError(401))
      renderWithQuery(<UsersPage />)

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load users')
    })

    it('shows a generic message on a network error', async () => {
      mockGet().mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
      renderWithQuery(<UsersPage />)

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load users')
    })

    it('shows a generic message for a non-Axios error', async () => {
      mockGet().mockRejectedValue(new Error('boom'))
      renderWithQuery(<UsersPage />)

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load users')
    })

    it('does not retry a failed request', async () => {
      const get = mockGet().mockRejectedValue(httpError(500))
      renderWithQuery(<UsersPage />)
      await screen.findByRole('alert')

      expect(get).toHaveBeenCalledTimes(1)
    })
  })
})
