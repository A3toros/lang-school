import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginForm from '../../components/login/LoginForm'
import { createMockUser } from '../../utils/testHelpers'

const mockOnLogin = jest.fn()

const renderLoginForm = (props = {}) => {
  return render(
    <LoginForm 
      onLogin={mockOnLogin}
      error=""
      {...props}
    />
  )
}

describe('LoginForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders login form correctly', () => {
    renderLoginForm()
    
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  test('shows error message when provided', () => {
    const errorMessage = 'Invalid credentials'
    renderLoginForm({ error: errorMessage })
    
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  test('calls onLogin with correct credentials', async () => {
    renderLoginForm()
    
    const usernameInput = screen.getByPlaceholderText(/username/i)
    const passwordInput = screen.getByPlaceholderText(/password/i)
    const loginButton = screen.getByRole('button', { name: /login/i })
    
    fireEvent.change(usernameInput, { target: { value: 'admin' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(loginButton)
    
    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('admin', 'password123')
    })
  })

  test('validates required fields', async () => {
    renderLoginForm()
    
    const loginButton = screen.getByRole('button', { name: /login/i })
    fireEvent.click(loginButton)
    
    // Should not call onLogin with empty values
    expect(mockOnLogin).not.toHaveBeenCalled()
  })

  test('handles form submission', async () => {
    renderLoginForm()
    
    const usernameInput = screen.getByPlaceholderText(/username/i)
    const passwordInput = screen.getByPlaceholderText(/password/i)
    const form = screen.getByRole('form')
    
    fireEvent.change(usernameInput, { target: { value: 'admin' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.submit(form)
    
    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith('admin', 'password123')
    })
  })
})
