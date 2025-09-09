import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StudentManagement from '../../../components/admin/StudentManagement'
import { mockStudents, mockTeachers, mockApiService } from '../../../utils/testHelpers'

// Mock the API service
jest.mock('../../../utils/api', () => mockApiService)

const mockOnStudentSelect = jest.fn()

const renderStudentManagement = (props = {}) => {
  return render(
    <StudentManagement 
      onStudentSelect={mockOnStudentSelect}
      selectedStudent={null}
      {...props}
    />
  )
}

describe('StudentManagement Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockApiService.getStudents.mockResolvedValue({
      success: true,
      students: mockStudents,
      total: mockStudents.length
    })
    mockApiService.getTeachers.mockResolvedValue({
      success: true,
      teachers: mockTeachers
    })
  })

  test('renders student management correctly', async () => {
    renderStudentManagement()
    
    await waitFor(() => {
      expect(screen.getByText(/Student Management/i)).toBeInTheDocument()
      expect(screen.getByText(/Add New Student/i)).toBeInTheDocument()
    })
  })

  test('displays students list', async () => {
    renderStudentManagement()
    
    await waitFor(() => {
      expect(screen.getByText('Emma Wilson')).toBeInTheDocument()
      expect(screen.getByText('James Brown')).toBeInTheDocument()
    })
  })

  test('shows add student modal when button clicked', async () => {
    renderStudentManagement()
    
    const addButton = screen.getByText(/Add New Student/i)
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Add New Student/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/Student Name/i)).toBeInTheDocument()
    })
  })

  test('filters students by name', async () => {
    renderStudentManagement()
    
    const searchInput = screen.getByPlaceholderText(/Search by name/i)
    fireEvent.change(searchInput, { target: { value: 'Emma' } })
    
    await waitFor(() => {
      expect(mockApiService.getStudents).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Emma' })
      )
    })
  })

  test('handles student selection', async () => {
    renderStudentManagement()
    
    await waitFor(() => {
      const studentRow = screen.getByText('Emma Wilson')
      fireEvent.click(studentRow)
      expect(mockOnStudentSelect).toHaveBeenCalledWith(mockStudents[0])
    })
  })

  test('shows reassign dropdown', async () => {
    renderStudentManagement()
    
    await waitFor(() => {
      const reassignSelects = screen.getAllByDisplayValue('Reassign')
      expect(reassignSelects.length).toBeGreaterThan(0)
    })
  })

  test('handles student deletion', async () => {
    window.confirm = jest.fn(() => true)
    mockApiService.deleteStudent.mockResolvedValue({ success: true })
    
    renderStudentManagement()
    
    await waitFor(() => {
      const deleteButton = screen.getByText('Delete')
      fireEvent.click(deleteButton)
      expect(window.confirm).toHaveBeenCalled()
    })
  })
})
