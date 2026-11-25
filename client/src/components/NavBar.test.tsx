import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderWithQuery } from '@/test/render'
import NavBar from './NavBar'

// The sign-out button talks to the auth server; the nav links don't need it
vi.mock('../lib/auth-client', () => ({ authClient: { signOut: vi.fn() } }))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('NavBar: FAQs link', () => {
  it('shows the FAQs link to admins, pointing at /knowledge', () => {
    renderWithQuery(<NavBar name="Ada Admin" isAdmin />)

    expect(screen.getByRole('link', { name: 'FAQs' })).toHaveAttribute('href', '/knowledge')
  })

  it('hides the FAQs link, and Users, from agents', () => {
    renderWithQuery(<NavBar name="Alan Agent" isAdmin={false} />)

    expect(screen.queryByRole('link', { name: 'FAQs' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tickets' })).toBeInTheDocument()
  })

  it('keeps the Users link next to it for admins', () => {
    renderWithQuery(<NavBar name="Ada Admin" isAdmin />)

    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/users')
  })
})
