import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import App from '../App'
import { createMockAuthContext } from '../utils/testHelpers'

// Mock the AuthContext
jest.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => createMockAuthContext().useAuth()
}))

// Mock the API service
jest.mock('../utils/api', () => ({
  __esModule: true,
  default: {
    getTeachers: jest.fn().mockResolvedValue({ success: true, teachers: [] }),
    getStudents: jest.fn().mockResolvedValue({ success: true, students: [] }),
    getCourses: jest.fn().mockResolvedValue({ success: true, courses: [] }),
    getMissionContent: jest.fn().mockResolvedValue({ success: true, mission: null })
  }
}))

const renderApp = () => {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders without crashing', () => {
    renderApp()
    expect(screen.getByText(/Welcome to LangSchool/i)).toBeInTheDocument()
  })

  test('renders login page by default', () => {
    renderApp()
    expect(screen.getByText(/Welcome to LangSchool/i)).toBeInTheDocument()
    expect(screen.getByText(/Meet Our Teachers/i)).toBeInTheDocument()
  })

  test('renders navigation correctly', () => {
    renderApp()
    expect(screen.getByText(/Welcome to LangSchool/i)).toBeInTheDocument()
  })
})
