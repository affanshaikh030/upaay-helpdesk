import axios, { AxiosError, type AxiosResponse } from 'axios'
import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Role } from '@helpdesk/core'
import { Dialog } from '@/components/ui/dialog'
import { renderWithQuery } from '@/test/render'
import { UserForm } from './UserForm'

const createdUser = {
  id: '3',
  name: 'New Agent',
  email: 'new@test.local',
  role: Role.AGENT,
  createdAt: '2026-04-01T10:00:00.000Z',
}

function renderForm(onDone = vi.fn()) {
  // The Cancel button is a DialogClose, so the form needs a Dialog around it
  renderWithQuery(
    <Dialog open>
      <UserForm onDone={onDone} />
    </Dialog>,
  )
  return { onDone }
}

function fill(values: { name?: string; email?: string; password?: string }) {
  if (values.name !== undefined) fireEvent.change(screen.getByLabelText('Name'), { target: { value: values.name } })
  if (values.email !== undefined) fireEvent.change(screen.getByLabelText('Email'), { target: { value: values.email } })
  if (values.password !== undefined) {
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: values.password } })
  }
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Create user' }))

function httpError(status: number, data: unknown) {
  const response = { status, data } as AxiosResponse
  return new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', undefined, undefined, response)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('UserForm', () => {
  it('renders empty name, email and password fields with submit and cancel buttons', () => {
    renderForm()

    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Create user' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  describe('validation', () => {
    it('shows an error for every invalid field and does not send a request', () => {
      const post = vi.spyOn(axios, 'post')
      renderForm()

      submit()

      expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument()
      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      expect(post).not.toHaveBeenCalled()
    })

    it('rejects a name shorter than 3 characters', () => {
      renderForm()
      fill({ name: 'Al', email: 'al@test.local', password: 'password123' })

      submit()

      expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument()
      expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument()
      expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument()
    })

    it('does not count surrounding whitespace towards the name length', () => {
      renderForm()
      fill({ name: ' Al ', email: 'al@test.local', password: 'password123' })

      submit()

      expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument()
    })

    it('rejects a password shorter than 8 characters but accepts exactly 8', async () => {
      const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: createdUser })
      renderForm()
      fill({ name: 'New Agent', email: 'new@test.local', password: '1234567' })

      submit()
      expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      expect(post).not.toHaveBeenCalled()

      fill({ password: '12345678' })
      submit()
      await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    })

    it('rejects a malformed email', () => {
      renderForm()
      fill({ name: 'New Agent', email: 'not-an-email', password: 'password123' })

      submit()

      expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    })

    it('marks invalid fields as invalid and links them to their message', () => {
      renderForm()

      submit()

      const name = screen.getByLabelText('Name')
      expect(name).toHaveAttribute('aria-invalid', 'true')
      expect(name).toHaveAccessibleDescription('Name must be at least 3 characters')
    })

    it('clears the errors once the fields are valid and resubmitted', async () => {
      vi.spyOn(axios, 'post').mockResolvedValue({ data: createdUser })
      renderForm()
      submit()
      expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument()

      fill({ name: 'New Agent', email: 'new@test.local', password: 'password123' })
      submit()

      await waitFor(() => expect(screen.queryByText('Name must be at least 3 characters')).not.toBeInTheDocument())
      expect(screen.getByLabelText('Name')).not.toHaveAttribute('aria-invalid')
    })
  })

  describe('submitting', () => {
    it('posts the values to /api/users and calls onDone on success', async () => {
      const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: createdUser })
      const { onDone } = renderForm()
      fill({ name: 'New Agent', email: 'new@test.local', password: 'password123' })

      submit()

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
      expect(post).toHaveBeenCalledTimes(1)
      expect(post).toHaveBeenCalledWith('/api/users', {
        name: 'New Agent',
        email: 'new@test.local',
        password: 'password123',
      })
    })

    it('trims the name and lowercases the email before sending', async () => {
      const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: createdUser })
      renderForm()
      fill({ name: '  New Agent  ', email: 'New@Test.LOCAL', password: 'password123' })

      submit()

      await waitFor(() => expect(post).toHaveBeenCalled())
      expect(post).toHaveBeenCalledWith('/api/users', {
        name: 'New Agent',
        email: 'new@test.local',
        password: 'password123',
      })
    })

    it('never sends a role', async () => {
      const post = vi.spyOn(axios, 'post').mockResolvedValue({ data: createdUser })
      renderForm()
      fill({ name: 'New Agent', email: 'new@test.local', password: 'password123' })

      submit()

      await waitFor(() => expect(post).toHaveBeenCalled())
      expect(post.mock.calls[0][1]).not.toHaveProperty('role')
    })

    it('disables the submit button and shows progress while the request is pending', async () => {
      vi.spyOn(axios, 'post').mockReturnValue(new Promise(() => {}))
      const { onDone } = renderForm()
      fill({ name: 'New Agent', email: 'new@test.local', password: 'password123' })

      submit()

      const button = await screen.findByRole('button', { name: 'Creating...' })
      expect(button).toBeDisabled()
      expect(onDone).not.toHaveBeenCalled()
    })
  })

  describe('server errors', () => {
    it('shows field errors returned by the server under the matching field', async () => {
      vi.spyOn(axios, 'post').mockRejectedValue(
        httpError(409, {
          error: 'Email already in use',
          fieldErrors: { email: ['A user with this email already exists'] },
        }),
      )
      const { onDone } = renderForm()
      fill({ name: 'New Agent', email: 'taken@test.local', password: 'password123' })

      submit()

      const message = await screen.findByText('A user with this email already exists')
      expect(message).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toHaveAccessibleDescription('A user with this email already exists')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(onDone).not.toHaveBeenCalled()
    })

    it('shows a generic alert when the server fails without field errors', async () => {
      vi.spyOn(axios, 'post').mockRejectedValue(httpError(500, { error: 'Internal Server Error' }))
      const { onDone } = renderForm()
      fill({ name: 'New Agent', email: 'new@test.local', password: 'password123' })

      submit()

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to create user')
      expect(onDone).not.toHaveBeenCalled()
    })

    it('shows a generic alert on a network error', async () => {
      vi.spyOn(axios, 'post').mockRejectedValue(new AxiosError('Network Error', 'ERR_NETWORK'))
      renderForm()
      fill({ name: 'New Agent', email: 'new@test.local', password: 'password123' })

      submit()

      expect(await screen.findByRole('alert')).toHaveTextContent('Failed to create user')
    })

    it('lets the user fix the input and submit again after a failure', async () => {
      const post = vi
        .spyOn(axios, 'post')
        .mockRejectedValueOnce(httpError(500, {}))
        .mockResolvedValueOnce({ data: createdUser })
      const { onDone } = renderForm()
      fill({ name: 'New Agent', email: 'new@test.local', password: 'password123' })

      submit()
      await screen.findByRole('alert')
      submit()

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1))
      expect(post).toHaveBeenCalledTimes(2)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})
