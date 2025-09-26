import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import LoadingSpinnerModal from '../common/LoadingSpinnerModal'
import SuccessNotification from '../common/SuccessNotification'
import apiService from '../../utils/api'

// =====================================================
// PACKAGE MANAGEMENT TABLE COMPONENT
// =====================================================

const PackageManagementTable = ({ 
  packages, 
  loading, 
  onDeletePackage, 
  onSort, 
  sortConfig,
  onPageChange,
  pagination 
}) => {
  const getPackageStatusColor = (status) => {
    switch (status) {
      case 'exhausted': return 'text-red-600 bg-red-50'
      case 'low': return 'text-yellow-600 bg-yellow-50'
      case 'active': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50">
            <th 
              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('student_name')}
            >
              Student Name
              {sortConfig.key === 'student_name' && (
                <span className="ml-1">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('lessons_remaining')}
            >
              Package
              {sortConfig.key === 'lessons_remaining' && (
                <span className="ml-1">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('date_added')}
            >
              Date Added
              {sortConfig.key === 'date_added' && (
                <span className="ml-1">
                  {sortConfig.direction === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
              </td>
            </tr>
          ) : packages.length === 0 ? (
            <tr>
              <td colSpan="4" className="px-4 py-8 text-center text-sm text-gray-500">
                No packages found
              </td>
            </tr>
          ) : (
            packages.map((pkg) => (
              <motion.tr
                key={pkg.package_id}
                className="hover:bg-gray-50"
                whileHover={{ scale: 1.01 }}
                transition={{ duration: 0.2 }}
              >
                <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {pkg.student_name}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPackageStatusColor(pkg.package_status)}`}>
                      {pkg.lessons_remaining} / {pkg.number_of_lessons}
                    </span>
                    <span className="text-gray-500">
                      ({pkg.lessons_taken} used)
                    </span>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(pkg.date_added).toLocaleDateString()}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => onDeletePackage(pkg)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </motion.tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 gap-2">
        <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total || 0)} of {pagination.total || 0} packages
        </div>
        <div className="flex space-x-2 justify-center sm:justify-end">
          <button
            onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            disabled={pagination.page === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-gray-700">
            Page {pagination.page} of {Math.ceil((pagination.total || 0) / pagination.limit)}
          </span>
          <button
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page >= Math.ceil((pagination.total || 0) / pagination.limit)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

// =====================================================
// ADD PACKAGE MODAL COMPONENT
// =====================================================

const AddPackageModal = ({ 
  isOpen, 
  onClose, 
  onAddPackage, 
  loading, 
  availableStudents,
  onStudentNameChange,
  onStudentSelect,
  newPackage,
  setNewPackage,
  showSuggestions,
  filteredStudents,
  showAutofillTip,
  autofillStudent
}) => {
  return (
    <LoadingSpinnerModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Package"
      onConfirm={onAddPackage}
      loading={loading}
      loadingText="Adding package..."
      confirmText="Add Package"
      cancelText="Cancel"
    >
      <div className="space-y-4">
        {/* Student Name Input with Autocomplete */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Student Name *
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Type student name..."
              value={newPackage.studentName}
              onChange={(e) => onStudentNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            
            {/* Autocomplete Suggestions */}
            {showSuggestions && filteredStudents.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => onStudentSelect(student)}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    {student.name}
                  </div>
                ))}
              </div>
            )}
            
            {/* Autofill Tip */}
            {showAutofillTip && autofillStudent && (
              <div className="absolute top-full left-0 mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                Press Enter to select: {autofillStudent.name}
              </div>
            )}
          </div>
        </div>

        {/* Number of Lessons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Lessons *
          </label>
          <input
            type="number"
            min="1"
            placeholder="Enter number of lessons"
            value={newPackage.numberOfLessons}
            onChange={(e) => setNewPackage(prev => ({ ...prev, numberOfLessons: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Date Added */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Added *
          </label>
          <input
            type="date"
            value={newPackage.dateAdded}
            onChange={(e) => setNewPackage(prev => ({ ...prev, dateAdded: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>
    </LoadingSpinnerModal>
  )
}

// =====================================================
// DELETE PACKAGE MODAL COMPONENT
// =====================================================

const DeletePackageModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  loading, 
  packageData 
}) => {
  return (
    <LoadingSpinnerModal
      isOpen={isOpen && !!packageData}
      onClose={onClose}
      title="Delete Package"
      confirmText="Delete Package"
      cancelText="Cancel"
      onConfirm={onConfirm}
      loading={loading}
      loadingText="Deleting..."
      confirmButtonColor="bg-red-500 hover:bg-red-600"
      disabled={loading}
    >
      {packageData && (
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete the package for <strong>{packageData.student_name}</strong>?
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-800 text-sm">
              This will permanently remove the package and all associated data.
            </p>
          </div>
        </div>
      )}
    </LoadingSpinnerModal>
  )
}

// =====================================================
// MAIN PACKAGE MANAGEMENT COMPONENT
// =====================================================

const PackageManagement = () => {
  // State management
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    name: '',
    status: 'all'
  })
  const [sortConfig, setSortConfig] = useState({
    key: 'date_added',
    direction: 'desc'
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  })
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteData, setDeleteData] = useState(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Student search states
  const [availableStudents, setAvailableStudents] = useState([])
  const [filteredStudents, setFilteredStudents] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showAutofillTip, setShowAutofillTip] = useState(false)
  const [autofillStudent, setAutofillStudent] = useState(null)
  const [autofillTimeout, setAutofillTimeout] = useState(null)
  
  // New package form
  const [newPackage, setNewPackage] = useState({
    studentName: '',
    studentId: null,
    numberOfLessons: '',
    dateAdded: new Date().toISOString().split('T')[0]
  })
  
  // Notification states
  const [showNotification, setShowNotification] = useState(false)
  const [notificationData, setNotificationData] = useState({ title: '', message: '', type: 'success' })

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  // Show success notification
  const showSuccessNotification = (title, message, type = 'success') => {
    setNotificationData({ title, message, type })
    setShowNotification(true)
  }

  // Fetch packages
  const fetchPackages = async () => {
    try {
      setLoading(true)
      const response = await apiService.getStudentPackages({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
        sort: sortConfig.key,
        direction: sortConfig.direction
      })
      if (response.success) {
        setPackages(response.packages)
        setPagination(prev => ({ ...prev, total: response.total || response.packages.length }))
      } else {
        showSuccessNotification('Error', `Failed to fetch packages: ${response.error || 'Unknown error'}`, 'error')
      }
    } catch (error) {
      console.error('❌ [FETCH_PACKAGES] Error fetching packages:', error)
      showSuccessNotification('Error', 'Error fetching packages', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Fetch available students
  const fetchAvailableStudents = async () => {
    try {
      const response = await apiService.getStudents({ status: 'active' })
      if (response.success) {
        setAvailableStudents(response.students)
      }
    } catch (error) {
      console.error('❌ [FETCH_AVAILABLE_STUDENTS] Error fetching students:', error)
    }
  }

  // Filter students for package creation
  const filterStudents = (input) => {
    if (!input.trim()) {
      setFilteredStudents([])
      setShowSuggestions(false)
      setShowAutofillTip(false)
      setAutofillStudent(null)
      return
    }

    const filtered = availableStudents.filter(student =>
      student.name.toLowerCase().includes(input.toLowerCase())
    )
    
    setFilteredStudents(filtered)
    setShowSuggestions(true)
    
    // Show autofill tip for 3 or fewer matches
    if (filtered.length <= 3 && filtered.length > 0) {
      setShowAutofillTip(true)
      setAutofillStudent(filtered[0])
    } else {
      setShowAutofillTip(false)
      setAutofillStudent(null)
    }
  }

  // Handle student name input change
  const handleStudentNameChange = (value) => {
    setNewPackage(prev => ({ ...prev, studentName: value, studentId: null }))
    
    // Clear existing timeout
    if (autofillTimeout) {
      clearTimeout(autofillTimeout)
    }
    
    // Set new timeout for autofill
    const timeout = setTimeout(() => {
      if (value.trim() && showAutofillTip && autofillStudent) {
        setNewPackage(prev => ({ 
          ...prev, 
          studentName: autofillStudent.name, 
          studentId: autofillStudent.id 
        }))
        setShowSuggestions(false)
        setShowAutofillTip(false)
        setAutofillStudent(null)
      }
    }, 2000)
    
    setAutofillTimeout(timeout)
    filterStudents(value)
  }

  // Handle student selection from suggestions
  const handleStudentSelect = (student) => {
    setNewPackage(prev => ({ 
      ...prev, 
      studentName: student.name, 
      studentId: student.id 
    }))
    setShowSuggestions(false)
    setShowAutofillTip(false)
    setAutofillStudent(null)
  }

  // Handle package sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Handle page change
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }))
  }

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Add new package
  const handleAddPackage = async () => {
    try {
      setIsAdding(true)
      
      if (!newPackage.studentId || !newPackage.numberOfLessons || !newPackage.dateAdded) {
        showSuccessNotification('Error', 'Please fill in all fields', 'error')
        return
      }

      // Check for duplicate packages
      const existingPackage = packages.find(pkg => 
        pkg.student_id === newPackage.studentId && 
        pkg.package_status !== 'exhausted'
      )
      
      if (existingPackage) {
        showSuccessNotification('Error', 'This student already has an active package. Please delete the existing package first.', 'error')
        return
      }

      const packageData = {
        student_id: newPackage.studentId,
        number_of_lessons: parseInt(newPackage.numberOfLessons),
        date_added: newPackage.dateAdded
      }

      const response = await apiService.addStudentPackage(packageData)
      
      if (response.success) {
        showSuccessNotification('Success!', 'Package added successfully', 'success')
        setShowAddModal(false)
        setNewPackage({
          studentName: '',
          studentId: null,
          numberOfLessons: '',
          dateAdded: new Date().toISOString().split('T')[0]
        })
        await fetchPackages()
      } else {
        showSuccessNotification('Error', `Failed to add package: ${response.error || 'Unknown error'}`, 'error')
      }
    } catch (error) {
      console.error('❌ [ADD_PACKAGE] Error adding package:', error)
      showSuccessNotification('Error', 'Error adding package', 'error')
    } finally {
      setIsAdding(false)
    }
  }

  // Delete package
  const handleDeletePackage = (packageData) => {
    setDeleteData(packageData)
    setShowDeleteModal(true)
  }

  const confirmDeletePackage = async () => {
    try {
      setIsDeleting(true)
      const response = await apiService.deleteStudentPackage(deleteData.package_id)
      
      if (response.success) {
        showSuccessNotification('Success!', 'Package deleted successfully', 'success')
        setShowDeleteModal(false)
        setDeleteData(null)
        await fetchPackages()
      } else {
        showSuccessNotification('Error', `Failed to delete package: ${response.error || 'Unknown error'}`, 'error')
      }
    } catch (error) {
      console.error('❌ [DELETE_PACKAGE] Error deleting package:', error)
      showSuccessNotification('Error', 'Error deleting package', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  // Check for exhausted packages (notification system)
  const checkExhaustedPackages = async () => {
    const today = new Date().toISOString().split('T')[0]
    const lastChecked = localStorage.getItem('exhaustedPackagesChecked')
    
    console.log('🔍 [CHECK_EXHAUSTED_PACKAGES] Starting check...', {
      today,
      lastChecked,
      shouldCheck: lastChecked !== today
    })
    
    if (lastChecked !== today) {
      console.log('✅ [CHECK_EXHAUSTED_PACKAGES] Need to check today - proceeding with API call')
      
      // Clear previous day's record
      if (lastChecked && lastChecked !== today) {
        console.log('🧹 [CHECK_EXHAUSTED_PACKAGES] Clearing previous day record:', lastChecked)
        localStorage.removeItem('exhaustedPackagesChecked')
      }
      
      try {
        console.log('📡 [CHECK_EXHAUSTED_PACKAGES] Calling getExhaustedPackages API...')
        const response = await apiService.getExhaustedPackages()
        console.log('📦 [CHECK_EXHAUSTED_PACKAGES] API Response:', {
          success: response.success,
          packageCount: response.packages?.length || 0,
          packages: response.packages
        })
        
        if (response.success && response.packages.length > 0) {
          console.log('⚠️ [CHECK_EXHAUSTED_PACKAGES] Found exhausted packages - showing notification')
          showSuccessNotification(
            'Exhausted Packages',
            `${response.packages.length} packages have been exhausted`,
            'warning'
          )
        } else {
          console.log('✅ [CHECK_EXHAUSTED_PACKAGES] No exhausted packages found')
        }
        
        localStorage.setItem('exhaustedPackagesChecked', today)
        console.log('💾 [CHECK_EXHAUSTED_PACKAGES] Saved check date to localStorage:', today)
      } catch (error) {
        console.error('❌ [CHECK_EXHAUSTED_PACKAGES] Error checking exhausted packages:', error)
      }
    } else {
      console.log('⏭️ [CHECK_EXHAUSTED_PACKAGES] Already checked today - skipping')
    }
  }

  // =====================================================
  // USE EFFECTS
  // =====================================================

  // Fetch packages when filters, sorting, or pagination change
  useEffect(() => {
    fetchPackages()
  }, [filters, sortConfig, pagination.page])

  // Fetch available students on mount
  useEffect(() => {
    fetchAvailableStudents()
  }, [])

  // Check for exhausted packages on mount
  useEffect(() => {
    checkExhaustedPackages()
  }, [])
  return (
    <div className="space-y-4">
      {/* Package Search and Add Button */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
          <div className="flex-1 max-w-md">
            <label className="block text-xs sm:text-sm text-gray-600 mb-1">Search by name</label>
            <input
              type="text"
              placeholder="Search packages by student name..."
              value={filters.name}
              onChange={(e) => handleFilterChange('name', e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            >
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="exhausted">Exhausted</option>
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary-500 hover:bg-primary-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded-lg text-sm transition-colors duration-200"
            >
              Add Package
            </button>
          </div>
        </div>
      </div>

      {/* Package Management Table */}
      <PackageManagementTable
        packages={packages}
        loading={loading}
        onDeletePackage={handleDeletePackage}
        onSort={handleSort}
        sortConfig={sortConfig}
        onPageChange={handlePageChange}
        pagination={pagination}
      />

      {/* Add Package Modal */}
      <AddPackageModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddPackage={handleAddPackage}
        loading={isAdding}
        availableStudents={availableStudents}
        onStudentNameChange={handleStudentNameChange}
        onStudentSelect={handleStudentSelect}
        newPackage={newPackage}
        setNewPackage={setNewPackage}
        showSuggestions={showSuggestions}
        filteredStudents={filteredStudents}
        showAutofillTip={showAutofillTip}
        autofillStudent={autofillStudent}
      />

      {/* Delete Package Modal */}
      <DeletePackageModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeletePackage}
        loading={isDeleting}
        packageData={deleteData}
      />

      {/* Success Notification */}
      <SuccessNotification
        isVisible={showNotification}
        onClose={() => setShowNotification(false)}
        title={notificationData.title}
        message={notificationData.message}
        type={notificationData.type}
        duration={4000}
      />
    </div>
  )
}

export default PackageManagement
export { PackageManagementTable, AddPackageModal, DeletePackageModal }
