# Language School Management System - Project Plan

## Project Overview
A React-based web application for managing teacher-student communication and scheduling, deployed on Netlify with Neon PostgreSQL database.

## Tech Stack
- **Frontend**: React with JSX, Tailwind CSS, Framer Motion
- **Backend**: Netlify Functions (Serverless)
- **Database**: Neon PostgreSQL
- **Deployment**: Netlify
- **Authentication**: JWT tokens with role-based access

## Project Structure

### Database Schema (Neon PostgreSQL)



### Frontend Structure (React + Vite)

```
lang-school/
├── index.html              # Single entry point
├── pics/
│   ├── teachers/
│   ├── courses/
│   └── backgrounds/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.jsx
│   │   │   ├── LoginForm.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── TokenManager.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── TeacherTabs.jsx
│   │   │   ├── ScheduleTable.jsx
│   │   │   ├── StudentManagement.jsx
│   │   │   ├── StudentModal.jsx
│   │   │   ├── TeacherManagement.jsx
│   │   │   ├── AddTeacherModal.jsx
│   │   │   ├── EditTeacherModal.jsx
│   │   │   ├── TeacherMonthlyStats.jsx
│   │   │   └── MonthlyStatsCard.jsx
│   │   ├── teacher/
│   │   │   ├── TeacherDashboard.jsx
│   │   │   ├── TeacherSchedule.jsx
│   │   │   └── LessonReportForm.jsx
│   │   └── login/
│   │       ├── LoginPage.jsx
│   │       ├── TeacherShowcase.jsx
│   │       ├── MissionSection.jsx
│   │       └── CoursesCarousel.jsx
│   ├── pages/
│   │   ├── AdminPage.jsx
│   │   ├── TeacherPage.jsx
│   │   └── LoginPage.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useApi.js
│   │   └── useSchedule.js
│   ├── utils/
│   │   ├── auth.js
│   │   ├── api.js
│   │   ├── dateUtils.js
│   │   ├── tokenManager.js
│   │   ├── validation.js
│   │   └── security.js
│   ├── context/
│   │   └── AuthContext.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── App.css (Tailwind directives + custom styles)
├── templates/
│   ├── admin.html          # Admin page template (reference)
│   ├── teacher.html        # Teacher page template (reference)
│   └── login.html          # Login page template (reference)
├── package.json
├── vite.config.js
├── tailwind.config.js
└── .env
```


```


## Application Structure (React + Vite)

### Single Page Application (SPA) with React Router
**Entry Point**: `public/index.html` - Single HTML file that loads the React app

**Routing Structure**:
- `/` - Login page with teacher showcase
- `/admin` - Admin dashboard (protected route)
- `/teacher` - Teacher dashboard (protected route)

### Complete File Structure
```
lang-school/
├── public/
│   ├── index.html
│   └── pics/
│       ├── teachers/
│       ├── courses/
│       └── banners/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── TokenManager.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── login/
│   │   │   ├── LoginForm.jsx
│   │   │   ├── TeacherShowcase.jsx
│   │   │   ├── MissionSection.jsx
│   │   │   └── CoursesCarousel.jsx
│   │   ├── admin/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── TeacherTabs.jsx
│   │   │   ├── ScheduleTable.jsx
│   │   │   ├── StudentManagement.jsx
│   │   │   ├── TeacherManagement.jsx
│   │   │   ├── TeacherPasswordManager.jsx
│   │   │   ├── PasswordChangeModal.jsx
│   │   │   ├── PasswordViewModal.jsx
│   │   │   ├── AttendanceTracking.jsx
│   │   │   ├── BulkOperations.jsx
│   │   │   ├── TeacherMonthlyStats.jsx
│   │   │   └── MonthlyStatsCard.jsx
│   │   └── teacher/
│   │       ├── TeacherDashboard.jsx
│   │       ├── TeacherSchedule.jsx
│   │       ├── LessonReportForm.jsx
│   │       ├── AttendanceMarker.jsx
│   │       └── TeacherProfile.jsx
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── AdminPage.jsx
│   │   └── TeacherPage.jsx
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useApi.js
│   │   ├── useLocalStorage.js
│   │   ├── useTokenRefresh.js
│   │   └── usePasswordManagement.js
│   ├── utils/
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── tokenManager.js
│   │   ├── validation.js
│   │   ├── security.js
│   │   ├── passwordUtils.js
│   │   ├── dateUtils.js
│   │   └── cloudinary.js
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   └── AdminContext.jsx
│   ├── services/
│   │   ├── authService.js
│   │   ├── teacherService.js
│   │   ├── studentService.js
│   │   ├── scheduleService.js
│   │   ├── passwordService.js
│   │   └── cloudinaryService.js
│   ├── App.jsx
│   ├── main.jsx
│   └── App.css (Tailwind directives + custom styles)
├── templates/
│   ├── admin.html          # Admin page template (reference)
│   ├── teacher.html        # Teacher page template (reference)
│   └── login.html          # Login page template (reference)
├── functions/
│   ├── auth.js
│   ├── teachers.js
│   ├── students.js
│   ├── schedules.js
│   ├── passwords.js
│   ├── cloudinary.js
│   ├── content.js
│   ├── attendance.js
│   ├── reports.js
│   ├── analytics.js
│   ├── users.js
│   ├── dashboard.js
│   └── utils/
│       ├── database.js
│       ├── jwt.js
│       └── validation.js
├── package.json
├── vite.config.js
├── tailwind.config.js
├── .env.example
├── .env (create from .env.example)
├── db-schema.sql
└── PROJECT_PLAN.md
```

### 1. Login Page (`/`)
**Purpose**: Landing page with login functionality and teacher showcase

**Components**:
- `LoginPage.jsx` - Main page component
- `LoginForm.jsx` - Login form in top-right corner
- `TeacherShowcase.jsx` - 3 randomly selected teacher cards
- `MissionSection.jsx` - Mission statement with banner
- `CoursesCarousel.jsx` - Rotating courses display

**Features**:
- Responsive design with Tailwind CSS
- Framer Motion animations
- Login form with validation
- Course popup modals
- Mobile-first approach

### 2. Admin Dashboard (`/admin`)
**Purpose**: Admin interface for managing teachers and students

**Components**:
- `AdminPage.jsx` - Main admin page
- `AdminDashboard.jsx` - Dashboard layout
- `TeacherTabs.jsx` - Horizontal scrollable teacher tabs with navigation arrows
- `ScheduleTable.jsx` - Weekly schedule management with responsive layouts
- `StudentManagement.jsx` - Student list and filtering
- `TeacherManagement.jsx` - Add/edit/delete teachers with username/password
- `TeacherPasswordManager.jsx` - Teacher password management interface
- `PasswordChangeModal.jsx` - Modal for changing teacher passwords
- `PasswordViewModal.jsx` - Modal for viewing teacher passwords
- `AttendanceTracking.jsx` - Attendance management and color coding
- `BulkOperations.jsx` - Bulk password and data operations
- `TeacherMonthlyStats.jsx` - Monthly statistics display
- `MonthlyStatsCard.jsx` - Individual teacher stats card
- `ContentManagement.jsx` - Content management interface
- `MissionEditor.jsx` - Mission statement and banner editor
- `CourseManager.jsx` - Course management interface
- `CourseEditor.jsx` - Course creation/editing modal
- `TeacherShowcaseManager.jsx` - Teacher showcase configuration
- `ImageUploader.jsx` - Cloudinary image upload component
- `ImagePreview.jsx` - Image preview with Cloudinary optimization
- `ResponsiveTable.jsx` - Responsive table wrapper component
- `MobileScheduleView.jsx` - Mobile-optimized schedule display

**Features**:
- Interactive schedule table with double-click editing
- Student search and filtering
- Save/discard changes functionality
- Student reassignment capabilities
- Teacher management (add/edit/delete)
- Teacher photo upload/change
- Teacher password management (view/change/reset)
- Password change history tracking
- Bulk password operations
- Attendance tracking with color coding
- Monthly statistics display
- Week navigation with month transitions
- Soft delete for students and teachers
- Data export functionality
- Content management (mission, courses, teacher showcase)
- Course management (create/edit/delete courses)
- Mission statement editor
- Teacher showcase configuration
- Cloudinary image upload and management
- Automatic image optimization and CDN delivery
- Image preview with transformations
- Teacher photo upload to Cloudinary
- Confirmation dialogs for destructive actions
- Real-time data updates
- **Responsive Design Features**:
  - Adaptive table layouts (7-column → 5-column → 3-column)
  - Mobile-optimized touch interactions
  - Word wrapping for long names
  - Condensed spacing on smaller screens
  - Touch-friendly button sizes (min 44px)
  - Optimized typography scaling

### 3. Teacher Dashboard (`/teacher`)
**Purpose**: Teacher interface for personal schedule and lesson reporting

**Components**:
- `TeacherPage.jsx` - Main teacher page
- `TeacherDashboard.jsx` - Dashboard layout
- `TeacherSchedule.jsx` - Personal schedule view
- `LessonReportForm.jsx` - Lesson reporting system
- `AttendanceMarker.jsx` - Mark lessons as completed/absent
- `TeacherProfile.jsx` - Teacher profile management

**Features**:
- Personal schedule view only
- Lesson report forms
- Student interaction tracking
- Comment system for lessons
- Attendance marking (completed/absent)
- Color-coded schedule display
- Profile management
- Lesson history tracking

## Page Specifications

### 1. Login Page (`LoginPage.jsx`)

#### Header Section
- **Login Container**: Top-right corner with padding
  - Username input field
  - Password input field
  - Login button
  - Form validation with database authentication
  - JWT token generation for role-based access

#### Main Content
- **Teacher Showcase**: 3 sections showing random teachers
  - Teacher photo
  - Teacher description
  - Rotate through all teachers (random selection of 3)

- **Mission Section**: 
  - Banner placeholder image
  - Mission statement text

- **Courses Carousel**:
  - Randomly display 1 out of 10 courses
  - Course background image with text overlay
  - Course name and description below image
  - Left/right arrow navigation
  - Click to open popup with detailed information
  - Popup closes on click outside or close button

### 2. Admin Page (`AdminPage.jsx`)

#### Header
- Menu button with dropdown
  - Logout option
  - User profile info

#### Teacher Tabs Section
- Horizontal scrollable tabs for all teachers
- Left/right arrows for navigation
- Each tab shows teacher name and photo

#### Responsive Design Breakpoints
- **Desktop (1024px+)**: Full table with all columns and padding
- **Tablet (720px)**: Compact table with reduced padding, smaller fonts
- **Mobile (480px)**: Condensed table layout with:
  - Minimal padding (4px instead of 16px)
  - Smaller font sizes (text-xs instead of text-sm)
  - Word wrapping for long names (break-words)
  - Stacked layout for time slots
  - Touch-friendly buttons (min 44px height)
- **Monthly Statistics Display**:
  - Current month lesson count (completed + absent)
  - Month navigation arrows (previous/next month)
  - Color-coded indicators (green for high attendance, red for low)
  - Quick stats: completed lessons, absent lessons, attendance percentage

#### Schedule Management
- **Week Navigation**:
  - Current month and week display
  - Left/right arrows to navigate weeks
  - Date display above each day (e.g., "30 Monday", "31 Tuesday")
  - Handle month transitions properly

- **Schedule Table**:
  - Time slots from 6:30 AM to 10:00 PM (30-minute intervals)
  - 7 columns for days of the week
  - Edit/Read mode toggle

- **Responsive Table Layouts**:
  - **Desktop (1024px+)**: Full 7-column table with all time slots
  - **Tablet (720px)**: 5-column table (Mon-Fri) with condensed time slots
  - **Mobile (480px)**: 3-column table (Mon-Wed-Fri) with:
    - Stacked time slots (6:30-8:00, 8:00-9:30, etc.)
    - Student names wrap to 2 lines with `break-words`
    - Minimal cell padding (`p-1` instead of `p-4`)
    - Smaller font sizes (`text-xs` for names, `text-2xs` for times)
    - Touch-optimized cell sizes (min 32px height)

- **Edit Mode Features**:
  - Double-click to add/edit student names
  - Autocomplete with existing students from database
  - Save button with confirmation popup
  - Discard changes button
  - Student reassignment functionality

- **Read Mode Features**:
  - Clickable student names
  - View teacher comments for specific dates
  - Lesson history display
  - **Color-coded attendance display**:
    - Green background for completed lessons
    - Red background for absent lessons
    - Gray background for scheduled lessons

#### Student Management Section
- **View All Students** button
- Paginated list (50 students per page)
- Filtering options:
  - By name
  - By date added
  - By number of lessons
  - By active/inactive status
- Search bar for name/date filtering
- Date range picker for lesson statistics
- Add new student functionality
- **Soft delete students** (mark as inactive, preserve historical data)
- **Reactivate students** (restore inactive students)

#### Teacher Management Section
- **Teacher Tabs Navigation**
  - Horizontal scrollable tabs showing all teachers
  - Left/right arrows for navigation when teachers don't fit on page
  - Each tab shows teacher name and photo
- **Add New Teacher** button with modal form
  - Teacher name input
  - Username input (for login)
  - Password input (will be hashed)
  - Email input with validation
  - Photo upload or URL input
  - Description text area
  - Save/Cancel buttons
  - Creates both teacher record and user account
- **Delete Teacher** functionality
  - Soft delete option (mark as inactive, preserve data)
  - Hard delete option (permanent removal)
  - Confirmation popup: "Are you sure? This will also deactivate all associated students and schedules."
  - Option to reassign students to another teacher before deletion
  - Deactivates both teacher record and user account
- **Reactivate Teacher** functionality
  - Restore inactive teachers
  - Reactivate associated user account
- **Edit Teacher** functionality
  - Edit button on each teacher tab
  - Pre-populated form with current teacher data
  - Update teacher information (name, email, photo, description)
  - Update username/password if needed
  - Change teacher photo

#### Content Management Section
- **Mission Content Editor**
  - Edit mission statement text
  - Upload/change mission banner image
  - Preview changes before saving
  - Save/Cancel functionality
- **Course Management**
  - View all courses in admin panel
  - Add new course with form:
    - Course name
    - Short description
    - Detailed description (for popup)
    - Background image upload
    - Display order setting
  - Edit existing courses
  - Delete courses (with confirmation)
  - Reorder courses for carousel display
- **Teacher Showcase Configuration**
  - Set number of teachers to display (default: 3)
  - Choose rotation type:
    - Random selection
    - Featured teachers only
    - Alphabetical order
  - Set featured teachers manually
  - Preview showcase appearance

### 3. Teacher Page (`TeacherPage.jsx`)

#### Header
- Menu button with dropdown
  - Logout option
  - User profile info

#### Personal Schedule
- Same schedule table as admin but filtered to current teacher
- **Responsive Design**: Same breakpoint optimizations as admin page
  - **Desktop (1024px+)**: Full table view
  - **Tablet (720px)**: Compact 5-column layout
  - **Mobile (480px)**: Condensed 3-column layout with word wrapping
- **Attendance marking system**:
  - Click on student slot to mark as completed/absent
  - Green background for completed lessons
  - Red background for absent lessons
  - Gray background for scheduled (not yet marked)
- Clickable student names for lesson reports

#### Lesson Reporting
- Click on student name opens lesson report form
- Form includes:
  - Student name
  - Lesson date and time
  - Comment text area
  - Save button
- Reports visible to admin in read mode

## Technical Implementation Details

### Authentication System
- JWT tokens with role-based access control
- Token storage in localStorage
- Automatic token refresh
- Protected routes for admin/teacher pages

### Token Management System
- **TokenManager.jsx** - Component for token operations
- **tokenManager.js** - Utility functions for token handling
- **ProtectedRoute.jsx** - Route protection component
- **useAuth.js** - Custom hook for authentication state

**Dual Token System Implementation**:
- **Access Token (30 min)**: Used for API authentication
- **Refresh Token (7 days)**: Used to renew access tokens
- **Auto-refresh Logic**: Check token 5 minutes before expiration
- **Token Rotation**: New refresh token on each refresh
- **Error Handling**: Redirect to login if refresh fails
- **Security**: Tokens stored securely in localStorage

#### Authentication Functions

**Login Functions:**
- `login(username, password)` - Authenticate user and return JWT tokens (access + refresh)
- `validateCredentials(username, password)` - Check username/password against database
- `storePassword(password)` - Store password in database (plain text)
- `comparePassword(inputPassword, storedPassword)` - Compare input with stored password

**Password Management Functions:**
- `resetUserPassword(userId)` - Generate new password and update in database
- `changePassword(userId, oldPassword, newPassword)` - Change user's password
- `generateNewPassword()` - Generate new password for user
- `validatePasswordStrength(password)` - Check password meets requirements
- `getUserPassword(userId)` - Get user's current password (for admin view)
- `updateUserPassword(userId, newPassword)` - Update user password in database

**Token Refresh Functions:**
- `refreshTokens(refreshToken)` - Generate new access token using refresh token
- `validateRefreshToken(refreshToken)` - Validate refresh token before use
- `rotateRefreshToken(oldRefreshToken)` - Generate new refresh token and invalidate old
- `handleTokenRefresh()` - Handle automatic token refresh with error handling

**Token Management Functions:**
- `generateAccessToken(userId, role, teacherId)` - Create 30-minute access token
- `generateRefreshToken(userId, role, teacherId)` - Create 7-day refresh token
- `verifyAccessToken(token)` - Validate access token and extract payload
- `verifyRefreshToken(token)` - Validate refresh token and extract payload
- `refreshAccessToken(refreshToken)` - Generate new access token using refresh token
- `decodeToken(token)` - Decode JWT payload without verification
- `isTokenExpired(token)` - Check if token has expired
- `getTokenExpiration(token)` - Get token expiration timestamp

**Storage Functions:**
- `storeTokens(accessToken, refreshToken)` - Save both tokens to localStorage
- `getStoredTokens()` - Retrieve both tokens from localStorage
- `getStoredAccessToken()` - Get only access token from storage
- `getStoredRefreshToken()` - Get only refresh token from storage
- `clearStoredTokens()` - Remove both tokens from localStorage
- `isTokensStored()` - Check if both tokens exist in storage
- `storeUserData(userData)` - Save user info to localStorage
- `getUserData()` - Retrieve user info from localStorage
- `clearUserData()` - Clear all user data from localStorage

**Role Management Functions:**
- `hasRole(requiredRole)` - Check if user has specific role (admin/teacher)
- `isAdmin()` - Check if current user is admin
- `isTeacher()` - Check if current user is teacher
- `getUserRole()` - Get current user's role
- `getTeacherId()` - Get teacher ID for teacher users

**Route Protection Functions:**
- `requireAuth()` - HOC for protecting routes requiring authentication
- `requireRole(role)` - HOC for protecting routes by role
- `requireAdmin()` - HOC for admin-only routes
- `requireTeacher()` - HOC for teacher-only routes
- `redirectIfAuthenticated()` - Redirect authenticated users away from login

**Session Management Functions:**
- `checkAuthStatus()` - Check if user is currently authenticated
- `logout()` - Clear all auth data and redirect to login
- `extendSession()` - Refresh token to extend session
- `handleTokenExpiry()` - Handle expired token scenarios
- `autoLogout()` - Automatically logout on token expiry

**API Integration Functions:**
- `getAuthHeaders()` - Get headers with auth token for API calls
- `makeAuthenticatedRequest(url, options)` - Make API request with auth
- `handleAuthError(error)` - Handle authentication errors from API
- `refreshTokenIfNeeded()` - Auto-refresh token before API calls

**Validation Functions:**
- `validateUsername(username)` - Check username format and availability
- `validatePassword(password)` - Check password strength requirements
- `validateEmail(email)` - Validate email format
- `sanitizeInput(input)` - Sanitize user input for security

**Token Operations**:
- Store/retrieve tokens from localStorage
- Validate token expiration
- Refresh expired tokens automatically
- Clear tokens on logout
- Role-based access control (admin/teacher)

**Token System Details**:
- **Access Token**: 30 minutes expiration (for API calls)
- **Refresh Token**: 7 days expiration (for renewing access tokens)
- **Auto-refresh**: Automatically refresh access token before expiration
- **Token Storage**: Both tokens stored in localStorage
- **Token Rotation**: New refresh token issued on each refresh
- **Logout**: Both tokens cleared on logout

**Token Management Functions**:
- `generateAccessToken(userId, role)` - Generate 30-minute access token
- `generateRefreshToken(userId, role)` - Generate 7-day refresh token
- `validateAccessToken(token)` - Validate access token and check expiration
- `validateRefreshToken(token)` - Validate refresh token and check expiration
- `refreshAccessToken(refreshToken)` - Generate new access token using refresh token
- `rotateRefreshToken(oldRefreshToken)` - Generate new refresh token and invalidate old one
- `storeTokens(accessToken, refreshToken)` - Store both tokens in localStorage
- `getStoredTokens()` - Retrieve both tokens from localStorage
- `clearStoredTokens()` - Remove both tokens from localStorage
- `isTokenExpired(token)` - Check if token is expired
- `getTokenExpiration(token)` - Get token expiration timestamp
- `shouldRefreshToken(accessToken)` - Check if access token needs refresh (5 min before expiry)
- `autoRefreshToken()` - Automatically refresh access token if needed
- `handleTokenRefresh()` - Handle token refresh with error handling
- `logoutUser()` - Clear all tokens and redirect to login

#### Teacher Management Functions

**Teacher CRUD Functions:**
- `createTeacher(teacherData)` - Create new teacher with user account
- `getTeacher(teacherId)` - Get teacher by ID with full details
- `getAllTeachers()` - Get all active teachers
- `updateTeacher(teacherId, teacherData)` - Update teacher information
- `deleteTeacher(teacherId)` - Soft delete teacher (mark as inactive)
- `reactivateTeacher(teacherId)` - Reactivate inactive teacher
- `getTeacherStats(teacherId)` - Get teacher performance statistics

**Teacher Schedule Functions:**
- `getTeacherSchedule(teacherId, weekStart)` - Get teacher's weekly schedule
- `getTeacherScheduleByMonth(teacherId, year, month)` - Get monthly schedule
- `updateTeacherSchedule(teacherId, scheduleData)` - Update schedule assignments
- `getTeacherAvailability(teacherId, date)` - Check teacher availability
- `markLessonAttendance(scheduleId, status)` - Mark lesson as completed/absent
- `getTeacherAttendanceStats(teacherId, period)` - Get attendance statistics

**Teacher Student Management Functions:**
- `getTeacherStudents(teacherId)` - Get all students assigned to teacher
- `assignStudentToTeacher(studentId, teacherId)` - Assign student to teacher
- `reassignStudent(studentId, newTeacherId)` - Move student to different teacher
- `getStudentProgress(studentId, teacherId)` - Get student's progress with teacher
- `getTeacherStudentStats(teacherId)` - Get statistics about teacher's students

**Lesson Reporting Functions:**
- `createLessonReport(teacherId, studentId, reportData)` - Create lesson report
- `getLessonReports(teacherId, filters)` - Get teacher's lesson reports
- `updateLessonReport(reportId, reportData)` - Update existing report
- `deleteLessonReport(reportId)` - Delete lesson report
- `getStudentLessonHistory(studentId, teacherId)` - Get student's lesson history
- `getTeacherReportStats(teacherId, period)` - Get reporting statistics

**Teacher Dashboard Functions:**
- `getTeacherDashboard(teacherId)` - Get complete dashboard data
- `getTeacherMonthlyStats(teacherId, year, month)` - Get monthly statistics
- `getTeacherWeeklyStats(teacherId, weekStart)` - Get weekly statistics
- `getTeacherAttendanceRate(teacherId, period)` - Calculate attendance rate
- `getTeacherStudentCount(teacherId)` - Get number of active students
- `getTeacherUpcomingLessons(teacherId, days)` - Get upcoming lessons

**Teacher Profile Functions:**
- `updateTeacherProfile(teacherId, profileData)` - Update teacher profile
- `uploadTeacherPhoto(teacherId, photoFile)` - Upload teacher photo
- `updateTeacherPassword(teacherId, newPassword)` - Change teacher password
- `getTeacherProfile(teacherId)` - Get teacher profile information
- `validateTeacherEmail(email, teacherId)` - Check email availability

**Teacher Analytics Functions:**
- `getTeacherPerformanceMetrics(teacherId, period)` - Get performance metrics
- `getTeacherLessonCount(teacherId, period)` - Count lessons taught
- `getTeacherStudentRetention(teacherId)` - Calculate student retention rate
- `getTeacherPopularityScore(teacherId)` - Calculate teacher popularity
- `getTeacherEfficiencyMetrics(teacherId)` - Get teaching efficiency data
- `getTeacherTrends(teacherId, period)` - Get performance trends over time

**Teacher Communication Functions:**
- `sendTeacherNotification(teacherId, message)` - Send notification to teacher
- `getTeacherNotifications(teacherId)` - Get teacher's notifications
- `markNotificationRead(notificationId)` - Mark notification as read
- `getTeacherMessages(teacherId)` - Get teacher's messages
- `sendMessageToAdmin(teacherId, message)` - Send message to admin

**Teacher Validation Functions:**
- `validateTeacherData(teacherData)` - Validate teacher information
- `checkTeacherAvailability(teacherId, timeSlot)` - Check if teacher is available
- `validateTeacherSchedule(scheduleData)` - Validate schedule data
- `checkTeacherPermissions(teacherId, action)` - Check if teacher can perform action
- `validateTeacherAccess(teacherId, resourceId)` - Validate teacher access to resource

#### Student Management Functions

**Student CRUD Functions:**
- `createStudent(studentData)` - Create new student
- `getStudent(studentId)` - Get student by ID with full details
- `getAllStudents(filters)` - Get all students with optional filtering
- `updateStudent(studentId, studentData)` - Update student information
- `deleteStudent(studentId)` - Soft delete student (mark as inactive)
- `reactivateStudent(studentId)` - Reactivate inactive student
- `getStudentStats(studentId)` - Get student performance statistics

**Student Schedule Functions:**
- `getStudentSchedule(studentId, weekStart)` - Get student's weekly schedule
- `addStudentToSchedule(studentId, scheduleData)` - Add student to schedule
- `removeStudentFromSchedule(studentId, scheduleId)` - Remove from schedule
- `updateStudentSchedule(studentId, scheduleData)` - Update student schedule
- `getStudentAttendance(studentId, period)` - Get student attendance record
- `getStudentUpcomingLessons(studentId, days)` - Get upcoming lessons

**Student Progress Functions:**
- `getStudentProgress(studentId)` - Get overall student progress
- `getStudentLessonHistory(studentId)` - Get complete lesson history
- `getStudentAttendanceRate(studentId, period)` - Calculate attendance rate
- `getStudentPerformanceMetrics(studentId)` - Get performance metrics
- `getStudentGoals(studentId)` - Get student learning goals
- `updateStudentGoals(studentId, goals)` - Update learning goals

**Student Teacher Assignment Functions:**
- `assignStudentToTeacher(studentId, teacherId)` - Assign student to teacher
- `reassignStudent(studentId, newTeacherId)` - Move student to different teacher
- `getStudentTeachers(studentId)` - Get all teachers student has had
- `getStudentCurrentTeacher(studentId)` - Get current assigned teacher
- `getStudentTeacherHistory(studentId)` - Get teacher assignment history

**Student Analytics Functions:**
- `getStudentTrends(studentId, period)` - Get performance trends
- `getStudentEngagement(studentId)` - Calculate engagement score
- `getStudentRetention(studentId)` - Check if student is retained
- `getStudentSatisfaction(studentId)` - Get satisfaction metrics
- `getStudentLearningVelocity(studentId)` - Calculate learning speed
- `getStudentWeakAreas(studentId)` - Identify areas needing improvement

**Student Communication Functions:**
- `sendStudentNotification(studentId, message)` - Send notification to student
- `getStudentNotifications(studentId)` - Get student's notifications
- `getStudentMessages(studentId)` - Get student's messages
- `sendMessageToTeacher(studentId, teacherId, message)` - Send message to teacher
- `getStudentFeedback(studentId)` - Get feedback about student

**Student Validation Functions:**
- `validateStudentData(studentData)` - Validate student information
- `checkStudentAvailability(studentId, timeSlot)` - Check if student is available
- `validateStudentSchedule(scheduleData)` - Validate schedule data
- `checkStudentPermissions(studentId, action)` - Check if student can perform action
- `validateStudentAccess(studentId, resourceId)` - Validate student access to resource

#### Admin Management Functions

**Admin Dashboard Functions:**
- `getAdminDashboard()` - Get complete admin dashboard data
- `getSystemOverview()` - Get system-wide statistics and metrics
- `getAdminStats(period)` - Get admin-specific statistics
- `getSystemHealth()` - Check system health and performance
- `getAdminNotifications()` - Get admin notifications and alerts
- `getSystemAlerts()` - Get critical system alerts

**Admin Teacher Management Functions:**
- `getAllTeachersForAdmin(filters)` - Get all teachers with admin view
- `createTeacherAsAdmin(teacherData)` - Create teacher with admin privileges
- `updateTeacherAsAdmin(teacherId, teacherData)` - Update teacher with admin access
- `deleteTeacherAsAdmin(teacherId, hardDelete)` - Delete teacher (soft/hard delete)
- `reactivateTeacherAsAdmin(teacherId)` - Reactivate inactive teacher
- `getTeacherPerformanceAdmin(teacherId)` - Get teacher performance for admin
- `bulkUpdateTeachers(teacherIds, updates)` - Bulk update multiple teachers
- `exportTeachersData(format)` - Export teachers data to file

**Admin Student Management Functions:**
- `getAllStudentsForAdmin(filters, pagination)` - Get all students with admin view
- `createStudentAsAdmin(studentData)` - Create student with admin privileges
- `updateStudentAsAdmin(studentId, studentData)` - Update student with admin access
- `deleteStudentAsAdmin(studentId, hardDelete)` - Delete student (soft/hard delete)
- `reactivateStudentAsAdmin(studentId)` - Reactivate inactive student
- `getStudentPerformanceAdmin(studentId)` - Get student performance for admin
- `bulkUpdateStudents(studentIds, updates)` - Bulk update multiple students
- `exportStudentsData(format)` - Export students data to file
- `getStudentAnalytics(period)` - Get comprehensive student analytics

**Admin Schedule Management Functions:**
- `getAllSchedules(weekStart)` - Get all teacher schedules for admin
- `updateScheduleAsAdmin(scheduleId, scheduleData)` - Update schedule with admin privileges
- `bulkUpdateSchedules(scheduleUpdates)` - Bulk update multiple schedules
- `getScheduleConflicts()` - Check for schedule conflicts
- `resolveScheduleConflict(conflictId, resolution)` - Resolve schedule conflict
- `getScheduleAnalytics(period)` - Get schedule analytics and insights
- `exportScheduleData(period, format)` - Export schedule data

**Admin Attendance Management Functions:**
- `getAllAttendance(period)` - Get all attendance records
- `updateAttendanceAsAdmin(attendanceId, status)` - Update attendance with admin privileges
- `bulkUpdateAttendance(attendanceUpdates)` - Bulk update attendance records
- `getAttendanceAnalytics(period)` - Get attendance analytics
- `getAttendanceReports(period)` - Generate attendance reports
- `exportAttendanceData(period, format)` - Export attendance data

**Admin Lesson Report Functions:**
- `getAllLessonReports(filters)` - Get all lesson reports for admin
- `getLessonReportAdmin(reportId)` - Get specific lesson report for admin
- `updateLessonReportAsAdmin(reportId, reportData)` - Update lesson report with admin privileges
- `deleteLessonReportAsAdmin(reportId)` - Delete lesson report with admin privileges
- `getLessonReportAnalytics(period)` - Get lesson report analytics
- `exportLessonReports(period, format)` - Export lesson reports

**Admin User Management Functions:**
- `getAllUsers()` - Get all users (teachers and admins)
- `createUserAsAdmin(userData)` - Create user with admin privileges
- `updateUserAsAdmin(userId, userData)` - Update user with admin access
- `deleteUserAsAdmin(userId)` - Delete user with admin privileges
- `resetUserPassword(userId)` - Generate new password and update in database
- `getUserPassword(userId)` - View user's current password
- `updateUserPassword(userId, newPassword)` - Update user password
- `updateUserRole(userId, newRole)` - Change user role
- `getUserActivity(userId, period)` - Get user activity logs
- `suspendUser(userId, reason)` - Suspend user account
- `unsuspendUser(userId)` - Unsuspend user account

**Admin Teacher Password Management Functions:**
- `getTeacherPassword(teacherId)` - View teacher's current password
- `changeTeacherPassword(teacherId, newPassword)` - Change teacher's password
- `resetTeacherPassword(teacherId)` - Generate new password for teacher
- `getTeacherPasswordHistory(teacherId)` - Get teacher's password change history
- `bulkChangeTeacherPasswords(teacherIds, newPassword)` - Change multiple teacher passwords
- `validateTeacherPassword(teacherId, password)` - Validate teacher's current password
- `getPasswordChangedByAdmin(teacherId)` - Check if password was changed by admin

**Admin Content Management Functions:**
- `getMissionContent()` - Get mission statement and banner
- `updateMissionContent(missionData)` - Update mission text and banner image
- `getAllCourses()` - Get all courses for carousel
- `createCourse(courseData)` - Create new course
- `updateCourse(courseId, courseData)` - Update course information
- `deleteCourse(courseId)` - Delete course
- `getCourse(courseId)` - Get specific course details
- `uploadCourseImage(courseId, imageFile)` - Upload course background image
- `getTeacherShowcaseSettings()` - Get teacher showcase configuration
- `updateTeacherShowcaseSettings(settings)` - Update showcase settings (number of teachers, rotation, etc.)
- `getRandomTeachers(count)` - Get random teachers for showcase
- `setFeaturedTeachers(teacherIds)` - Set specific teachers to be featured

**Cloudinary Image Management Functions:**
- `uploadImageToCloudinary(imageFile, folder)` - Upload image to Cloudinary
- `deleteImageFromCloudinary(publicId)` - Delete image from Cloudinary
- `getCloudinaryUrl(publicId, transformations)` - Get optimized image URL
- `uploadTeacherPhoto(teacherId, imageFile)` - Upload teacher photo to Cloudinary
- `uploadCourseImage(courseId, imageFile)` - Upload course image to Cloudinary
- `uploadMissionBanner(imageFile)` - Upload mission banner to Cloudinary
- `updateImageInDatabase(table, recordId, cloudinaryUrl, publicId)` - Update database with Cloudinary data
- `validateImageFile(file)` - Validate image file before upload
- `resizeImageForUpload(file, maxWidth, maxHeight)` - Resize image before upload

**Admin System Configuration Functions:**
- `getSystemSettings()` - Get system configuration settings
- `updateSystemSettings(settings)` - Update system configuration
- `getSystemLogs(level, period)` - Get system logs
- `clearSystemLogs(olderThan)` - Clear old system logs
- `backupDatabase()` - Create database backup
- `restoreDatabase(backupId)` - Restore from backup
- `getSystemMetrics()` - Get system performance metrics
- `optimizeDatabase()` - Optimize database performance

**Admin Analytics and Reporting Functions:**
- `getSystemAnalytics(period)` - Get comprehensive system analytics
- `getTeacherAnalytics(period)` - Get teacher performance analytics
- `getStudentAnalytics(period)` - Get student performance analytics
- `getFinancialAnalytics(period)` - Get financial analytics (if applicable)
- `generateCustomReport(reportConfig)` - Generate custom reports
- `getTrendAnalysis(metric, period)` - Get trend analysis for metrics
- `getComparativeAnalysis(period1, period2)` - Compare periods
- `exportAnalyticsData(analyticsType, format)` - Export analytics data

**Admin Communication Functions:**
- `sendSystemNotification(message, recipients)` - Send system-wide notification
- `sendTeacherNotification(teacherId, message)` - Send notification to specific teacher
- `sendBulkNotification(message, userIds)` - Send notification to multiple users
- `getSystemMessages()` - Get system messages
- `createSystemAnnouncement(announcement)` - Create system announcement
- `getAnnouncements()` - Get all announcements
- `updateAnnouncement(announcementId, updates)` - Update announcement
- `deleteAnnouncement(announcementId)` - Delete announcement

**Admin Security Functions:**
- `getSecurityLogs(period)` - Get security-related logs
- `getFailedLoginAttempts(period)` - Get failed login attempts
- `blockUser(userId, reason)` - Block user account
- `unblockUser(userId)` - Unblock user account
- `getSuspiciousActivity()` - Get suspicious activity reports
- `updateSecuritySettings(settings)` - Update security configuration
- `getAccessLogs(userId, period)` - Get user access logs
- `auditUserActions(userId, period)` - Audit user actions

**Admin Validation Functions:**
- `validateAdminData(adminData)` - Validate admin information
- `checkAdminPermissions(adminId, action)` - Check admin permissions
- `validateSystemSettings(settings)` - Validate system configuration
- `checkDataIntegrity()` - Check database integrity
- `validateBulkOperation(operation, data)` - Validate bulk operations
- `checkSystemConstraints()` - Check system constraints

### Database Integration
- Neon PostgreSQL connection
- Serverless functions for API endpoints
- Connection pooling for performance

### CSS Architecture
- **Tailwind CSS**: Primary styling framework
- **App.css**: Contains Tailwind directives and custom styles
- **No global.css needed**: Tailwind handles global styles
- **Custom animations**: Defined in Tailwind config
- **Component-specific styles**: Handled via Tailwind classes

### Responsive Design System
- **Breakpoints**:
  - `sm`: 640px (small mobile)
  - `md`: 768px (large mobile)
  - `lg`: 1024px (tablet)
  - `xl`: 1280px (desktop)
  - `2xl`: 1536px (large desktop)

- **Custom Breakpoints**:
  - `720px`: Tablet optimization
  - `480px`: Mobile optimization

- **Typography Scale**:
  - Desktop: `text-sm` (14px) for table content
  - Tablet (720px): `text-xs` (12px) for table content
  - Mobile (480px): `text-xs` (12px) for names, `text-2xs` (10px) for times

- **Spacing Scale**:
  - Desktop: `p-4` (16px) cell padding
  - Tablet (720px): `p-2` (8px) cell padding
  - Mobile (480px): `p-1` (4px) cell padding

- **Table Layout Classes**:
  - Desktop: `table-fixed` with full width
  - Tablet: `table-auto` with condensed columns
  - Mobile: `table-fixed` with stacked time slots

- **Word Wrapping**:
  - Long student names: `break-words` class
  - Time slots: `whitespace-nowrap` on desktop, `whitespace-normal` on mobile
  - Teacher names: `truncate` on small screens

### Cloudinary Integration
- **Image Upload**: Automatic upload to Cloudinary CDN
- **URL Storage**: Store Cloudinary URLs in database
- **Public ID Tracking**: Store public_id for image deletion
- **Image Optimization**: Automatic resizing and optimization
- **CDN Delivery**: Fast global image delivery

### Environment Configuration
- **`.env.example`**: Template file with all required environment variables
- **`.env`**: Local environment file (create from .env.example)
- **Environment Variables**:
  - `NEON_DATABASE_URL`: PostgreSQL connection string
  - `CLOUDINARY_URL`: Cloudinary configuration URL
  - `JWT_SECRET`: Secret for access token signing
  - `JWT_REFRESH_SECRET`: Secret for refresh token signing
  - `COOKIE_DOMAIN`: Domain for httpOnly cookies
  - `ALLOWED_ORIGIN`: CORS allowed origin
  - `NODE_ENV`: Environment mode (development/production)

## API Functions Structure

**Note**: All Netlify Functions should use `await fetch()` instead of just `fetch()` for proper async handling.

### Authentication API (`/api/auth`)
**Environment Variables**: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_DOMAIN`, `ALLOWED_ORIGIN`, `NODE_ENV`

- **POST `/api/auth/login`** - User login (username/password)
- **POST `/api/auth/refresh`** - Refresh access token
- **POST `/api/auth/logout`** - User logout
- **GET `/api/auth/verify`** - Verify token validity
- **POST `/api/auth/change-password`** - Change user password
- **GET `/api/auth/profile`** - Get current user profile
- **POST `/api/auth/validate-credentials`** - Validate username/password
- **GET `/api/auth/check-username/:username`** - Check username availability

### Teachers API (`/api/teachers`)
**Environment Variables**: `NEON_DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGIN`, `NODE_ENV`

- **GET `/api/teachers`** - Get all teachers (admin) or current teacher
- **GET `/api/teachers/:id`** - Get specific teacher
- **POST `/api/teachers`** - Create new teacher (admin only)
- **PUT `/api/teachers/:id`** - Update teacher information
- **DELETE `/api/teachers/:id`** - Delete teacher (soft delete)
- **POST `/api/teachers/:id/reactivate`** - Reactivate teacher
- **GET `/api/teachers/:id/students`** - Get teacher's students
- **GET `/api/teachers/:id/schedule`** - Get teacher's schedule
- **GET `/api/teachers/:id/stats`** - Get teacher statistics
- **GET `/api/teachers/random/:count`** - Get random teachers for showcase
- **GET `/api/teachers/:id/monthly-stats/:year/:month`** - Get monthly statistics
- **GET `/api/teachers/:id/attendance`** - Get teacher's attendance records
- **GET `/api/teachers/:id/lessons`** - Get teacher's lesson history
- **POST `/api/teachers/:id/upload-photo`** - Upload teacher photo
- **GET `/api/teachers/search`** - Search teachers by name/email
- **POST `/api/teachers/bulk-update`** - Bulk update teachers
- **GET `/api/teachers/inactive`** - Get inactive teachers (admin only)

### Students API (`/api/students`)
**Environment Variables**: `NEON_DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGIN`, `NODE_ENV`

- **GET `/api/students`** - Get all students with filtering/pagination
- **GET `/api/students/:id`** - Get specific student
- **POST `/api/students`** - Create new student
- **PUT `/api/students/:id`** - Update student information
- **DELETE `/api/students/:id`** - Delete student (soft delete)
- **POST `/api/students/:id/reactivate`** - Reactivate student
- **GET `/api/students/:id/schedule`** - Get student's schedule
- **GET `/api/students/:id/lessons`** - Get student's lesson history
- **POST `/api/students/:id/reassign`** - Reassign student to different teacher
- **GET `/api/students/search`** - Search students by name/date
- **GET `/api/students/:id/attendance`** - Get student's attendance records
- **GET `/api/students/:id/progress`** - Get student's progress metrics
- **GET `/api/students/:id/teachers`** - Get student's teacher history
- **GET `/api/students/teacher/:teacherId`** - Get students by teacher
- **GET `/api/students/inactive`** - Get inactive students (admin only)
- **POST `/api/students/bulk-update`** - Bulk update students
- **GET `/api/students/export`** - Export students data

### Schedules API (`/api/schedules`)
**Environment Variables**: `NEON_DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGIN`, `NODE_ENV`

- **GET `/api/schedules`** - Get schedules with filters
- **GET `/api/schedules/week/:date`** - Get weekly schedule
- **POST `/api/schedules`** - Create schedule entry
- **PUT `/api/schedules/:id`** - Update schedule entry
- **DELETE `/api/schedules/:id`** - Delete schedule entry
- **POST `/api/schedules/bulk`** - Bulk update schedules
- **GET `/api/schedules/conflicts`** - Check for schedule conflicts
- **GET `/api/schedules/teacher/:teacherId`** - Get teacher's schedules
- **GET `/api/schedules/student/:studentId`** - Get student's schedules
- **GET `/api/schedules/month/:year/:month`** - Get monthly schedules
- **POST `/api/schedules/save-week`** - Save entire week schedule
- **POST `/api/schedules/discard-changes`** - Discard unsaved changes
- **GET `/api/schedules/available-slots`** - Get available time slots
- **POST `/api/schedules/reassign-student`** - Reassign student in schedule

### Attendance API (`/api/attendance`)
**Environment Variables**: `NEON_DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGIN`, `NODE_ENV`

- **GET `/api/attendance`** - Get attendance records
- **POST `/api/attendance/mark`** - Mark lesson attendance
- **PUT `/api/attendance/:id`** - Update attendance status
- **GET `/api/attendance/teacher/:id`** - Get teacher's attendance
- **GET `/api/attendance/student/:id`** - Get student's attendance
- **GET `/api/attendance/stats`** - Get attendance statistics
- **GET `/api/attendance/week/:date`** - Get weekly attendance
- **GET `/api/attendance/month/:year/:month`** - Get monthly attendance
- **POST `/api/attendance/bulk-mark`** - Bulk mark attendance
- **GET `/api/attendance/export`** - Export attendance data

### Lesson Reports API (`/api/reports`)
**Environment Variables**: `NEON_DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGIN`, `NODE_ENV`

- **GET `/api/reports`** - Get lesson reports
- **GET `/api/reports/:id`** - Get specific report
- **POST `/api/reports`** - Create lesson report
- **PUT `/api/reports/:id`** - Update lesson report
- **DELETE `/api/reports/:id`** - Delete lesson report
- **GET `/api/reports/teacher/:id`** - Get teacher's reports
- **GET `/api/reports/student/:id`** - Get student's reports
- **GET `/api/reports/date/:date`** - Get reports by date
- **GET `/api/reports/week/:date`** - Get weekly reports
- **GET `/api/reports/month/:year/:month`** - Get monthly reports
- **POST `/api/reports/bulk-create`** - Create multiple reports
- **GET `/api/reports/export`** - Export reports data

### Passwords API (`/api/passwords`)
**Environment Variables**: `NEON_DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGIN`, `NODE_ENV`

- **GET `/api/passwords/teacher/:id`** - Get teacher password (admin only)
- **PUT `/api/passwords/teacher/:id`** - Change teacher password
- **POST `/api/passwords/teacher/:id/reset`** - Reset teacher password
- **POST `/api/passwords/bulk-reset`** - Bulk reset passwords
- **GET `/api/passwords/history/:id`** - Get password change history
- **POST `/api/passwords/validate`** - Validate password strength
- **GET `/api/passwords/policy`** - Get password policy requirements
- **POST `/api/passwords/check-current`** - Check current password

### Content Management API (`/api/content`)
**Environment Variables**: `NEON_DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGIN`, `NODE_ENV`

- **GET `/api/content/mission`** - Get mission content
- **PUT `/api/content/mission`** - Update mission content
- **GET `/api/content/courses`** - Get all courses
- **GET `/api/content/courses/:id`** - Get specific course
- **POST `/api/content/courses`** - Create new course
- **PUT `/api/content/courses/:id`** - Update course
- **DELETE `/api/content/courses/:id`** - Delete course
- **GET `/api/content/showcase`** - Get teacher showcase settings
- **PUT `/api/content/showcase`** - Update showcase settings
- **POST `/api/content/featured-teachers`** - Set featured teachers
- **GET `/api/content/courses/active`** - Get active courses only
- **PUT `/api/content/courses/:id/toggle`** - Toggle course active status
- **POST `/api/content/courses/reorder`** - Reorder courses
- **GET `/api/content/export`** - Export content data

### Cloudinary API (`/api/cloudinary`)
**Environment Variables**: `CLOUDINARY_URL`, `JWT_SECRET`, `ALLOWED_ORIGIN`, `NODE_ENV`

- **POST `/api/cloudinary/upload`** - Upload image to Cloudinary
- **DELETE `/api/cloudinary/delete`** - Delete image from Cloudinary
- **POST `/api/cloudinary/upload-teacher-photo`** - Upload teacher photo
- **POST `/api/cloudinary/upload-course-image`** - Upload course image
- **POST `/api/cloudinary/upload-mission-banner`** - Upload mission banner
- **GET `/api/cloudinary/transform`** - Get transformed image URL
- **POST `/api/cloudinary/bulk-upload`** - Upload multiple images
- **GET `/api/cloudinary/images`** - List uploaded images

### Analytics API (`/api/analytics`)
**Environment Variables**: `NEON_DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGIN`, `NODE_ENV`

- **GET `/api/analytics/overview`** - Get system overview stats
- **GET `/api/analytics/teachers`** - Get teacher analytics
- **GET `/api/analytics/students`** - Get student analytics
- **GET `/api/analytics/attendance`** - Get attendance analytics
- **GET `/api/analytics/monthly/:teacherId`** - Get monthly teacher stats
- **GET `/api/analytics/trends`** - Get performance trends
- **POST `/api/analytics/export`** - Export analytics data
- **GET `/api/analytics/dashboard`** - Get dashboard data
- **GET `/api/analytics/performance`** - Get performance metrics
- **GET `/api/analytics/reports`** - Get analytics reports

### Users API (`/api/users`)
**Environment Variables**: `NEON_DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGIN`, `NODE_ENV`

- **GET `/api/users`** - Get all users (admin only)
- **GET `/api/users/:id`** - Get specific user
- **POST `/api/users`** - Create new user
- **PUT `/api/users/:id`** - Update user information
- **DELETE `/api/users/:id`** - Delete user
- **POST `/api/users/:id/suspend`** - Suspend user account
- **POST `/api/users/:id/unsuspend`** - Unsuspend user account
- **GET `/api/users/activity/:id`** - Get user activity logs
- **GET `/api/users/roles`** - Get available user roles

### Dashboard API (`/api/dashboard`)
**Environment Variables**: `NEON_DATABASE_URL`, `JWT_SECRET`, `ALLOWED_ORIGIN`, `NODE_ENV`

- **GET `/api/dashboard/admin`** - Get admin dashboard data
- **GET `/api/dashboard/teacher`** - Get teacher dashboard data
- **GET `/api/dashboard/stats`** - Get dashboard statistics
- **GET `/api/dashboard/notifications`** - Get user notifications
- **POST `/api/dashboard/notifications/read`** - Mark notification as read
- **GET `/api/dashboard/upcoming`** - Get upcoming lessons
- **GET `/api/dashboard/recent`** - Get recent activity

## SQL Queries for All Functions

### Authentication Queries
```sql
-- Login validation
SELECT u.id, u.username, u.password, u.role, u.teacher_id, u.is_active, t.name as teacher_name
FROM users u
LEFT JOIN teachers t ON u.teacher_id = t.id
WHERE u.username = $1 AND u.is_active = true;

-- Create user
INSERT INTO users (username, password, role, teacher_id) 
VALUES ($1, $2, $3, $4) RETURNING *;

-- Update password
UPDATE users SET password = $1, password_changed_at = CURRENT_TIMESTAMP 
WHERE id = $2;

-- Check username availability
SELECT COUNT(*) FROM users WHERE username = $1;
```

### Teacher Management Queries
```sql
-- Get all teachers
SELECT t.*, u.username, u.is_active as user_active
FROM teachers t
LEFT JOIN users u ON t.id = u.teacher_id
WHERE t.is_active = true;

-- Create teacher with user account
WITH new_teacher AS (
  INSERT INTO teachers (name, email, photo_url, description) 
  VALUES ($1, $2, $3, $4) RETURNING *
)
INSERT INTO users (username, password, role, teacher_id)
SELECT $5, $6, 'teacher', new_teacher.id FROM new_teacher;

-- Get teacher with students count
SELECT t.*, COUNT(s.id) as student_count
FROM teachers t
LEFT JOIN students s ON t.id = s.teacher_id AND s.is_active = true
WHERE t.id = $1
GROUP BY t.id;

-- Get teacher monthly stats
SELECT * FROM get_teacher_monthly_stats($1, $2, $3);

-- Get random teachers for showcase
SELECT t.* FROM teachers t
WHERE t.is_active = true
ORDER BY RANDOM()
LIMIT $1;
```

### Student Management Queries
```sql
-- Get students with pagination and filters
SELECT s.*, t.name as teacher_name, COUNT(sl.id) as lesson_count
FROM students s
LEFT JOIN teachers t ON s.teacher_id = t.id
LEFT JOIN student_lessons sl ON s.id = sl.student_id
WHERE s.is_active = true
  AND ($1 IS NULL OR s.name ILIKE '%' || $1 || '%')
  AND ($2 IS NULL OR s.added_date >= $2)
  AND ($3 IS NULL OR s.added_date <= $3)
GROUP BY s.id, t.name
ORDER BY s.added_date DESC
LIMIT $4 OFFSET $5;

-- Reassign student to different teacher
UPDATE students 
SET teacher_id = $1, updated_at = CURRENT_TIMESTAMP 
WHERE id = $2;

-- Get student progress
SELECT s.*, t.name as teacher_name,
       COUNT(sl.id) as total_lessons,
       COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
       COUNT(CASE WHEN ss.attendance_status = 'absent' THEN 1 END) as absent_lessons
FROM students s
LEFT JOIN teachers t ON s.teacher_id = t.id
LEFT JOIN student_lessons sl ON s.id = sl.student_id
LEFT JOIN student_schedules ss ON s.id = ss.student_id
WHERE s.id = $1
GROUP BY s.id, t.name;
```

### Schedule Management Queries
```sql
-- Get weekly schedule
SELECT ss.*, s.name as student_name, t.name as teacher_name
FROM student_schedules ss
JOIN students s ON ss.student_id = s.id
JOIN teachers t ON ss.teacher_id = t.id
WHERE ss.week_start_date = $1
  AND s.is_active = true
  AND t.is_active = true
ORDER BY ss.day_of_week, ss.time_slot;

-- Save week schedule (bulk insert)
INSERT INTO student_schedules (student_id, teacher_id, day_of_week, time_slot, week_start_date)
VALUES (UNNEST($1::int[]), UNNEST($2::int[]), UNNEST($3::int[]), UNNEST($4::text[]), $5)
ON CONFLICT (student_id, teacher_id, day_of_week, time_slot, week_start_date)
DO UPDATE SET updated_at = CURRENT_TIMESTAMP;

-- Check for schedule conflicts
SELECT ss1.*, s1.name as student1_name, s2.name as student2_name
FROM student_schedules ss1
JOIN student_schedules ss2 ON ss1.teacher_id = ss2.teacher_id 
  AND ss1.day_of_week = ss2.day_of_week 
  AND ss1.time_slot = ss2.time_slot
  AND ss1.week_start_date = ss2.week_start_date
  AND ss1.id != ss2.id
JOIN students s1 ON ss1.student_id = s1.id
JOIN students s2 ON ss2.student_id = s2.id
WHERE ss1.week_start_date = $1;
```

### Attendance Tracking Queries
```sql
-- Mark attendance
UPDATE student_schedules 
SET attendance_status = $1, attendance_date = CURRENT_DATE
WHERE id = $2;

-- Get attendance statistics
SELECT 
  COUNT(CASE WHEN attendance_status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN attendance_status = 'absent' THEN 1 END) as absent,
  COUNT(CASE WHEN attendance_status = 'scheduled' THEN 1 END) as scheduled,
  ROUND(COUNT(CASE WHEN attendance_status = 'completed' THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(CASE WHEN attendance_status IN ('completed', 'absent') THEN 1 END), 0) * 100, 2) as attendance_rate
FROM student_schedules
WHERE teacher_id = $1 AND week_start_date = $2;

-- Get monthly attendance
SELECT 
  DATE_TRUNC('month', attendance_date) as month,
  COUNT(CASE WHEN attendance_status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN attendance_status = 'absent' THEN 1 END) as absent
FROM student_schedules
WHERE teacher_id = $1 
  AND attendance_date >= $2 
  AND attendance_date <= $3
GROUP BY DATE_TRUNC('month', attendance_date);
```

### Lesson Reports Queries
```sql
-- Create lesson report
INSERT INTO lesson_reports (teacher_id, student_id, lesson_date, time_slot, comment)
VALUES ($1, $2, $3, $4, $5) RETURNING *;

-- Get teacher's reports
SELECT lr.*, s.name as student_name
FROM lesson_reports lr
JOIN students s ON lr.student_id = s.id
WHERE lr.teacher_id = $1
ORDER BY lr.lesson_date DESC;

-- Get reports by date range
SELECT lr.*, s.name as student_name, t.name as teacher_name
FROM lesson_reports lr
JOIN students s ON lr.student_id = s.id
JOIN teachers t ON lr.teacher_id = t.id
WHERE lr.lesson_date BETWEEN $1 AND $2
ORDER BY lr.lesson_date DESC;
```

### Content Management Queries
```sql
-- Get mission content
SELECT * FROM mission_content WHERE is_active = true LIMIT 1;

-- Update mission content
UPDATE mission_content 
SET title = $1, content = $2, banner_image = $3, banner_image_public_id = $4, updated_at = CURRENT_TIMESTAMP
WHERE id = $5;

-- Get courses for carousel
SELECT * FROM courses WHERE is_active = true ORDER BY display_order;

-- Create course
INSERT INTO courses (name, description, background_image, background_image_public_id, detailed_description, display_order)
VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;

-- Get teacher showcase settings
SELECT * FROM teacher_showcase_settings WHERE is_active = true LIMIT 1;

-- Get featured teachers
SELECT t.*, ft.display_order
FROM featured_teachers ft
JOIN teachers t ON ft.teacher_id = t.id
WHERE ft.is_active = true AND t.is_active = true
ORDER BY ft.display_order;
```

### Analytics Queries
```sql
-- Get system overview
SELECT 
  (SELECT COUNT(*) FROM teachers WHERE is_active = true) as total_teachers,
  (SELECT COUNT(*) FROM students WHERE is_active = true) as total_students,
  (SELECT COUNT(*) FROM student_schedules WHERE week_start_date = CURRENT_DATE) as today_lessons,
  (SELECT COUNT(*) FROM lesson_reports WHERE lesson_date = CURRENT_DATE) as today_reports;

-- Get teacher performance metrics
SELECT 
  t.name,
  COUNT(ss.id) as total_lessons,
  COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END) as completed_lessons,
  ROUND(COUNT(CASE WHEN ss.attendance_status = 'completed' THEN 1 END)::DECIMAL / 
        NULLIF(COUNT(ss.id), 0) * 100, 2) as attendance_rate
FROM teachers t
LEFT JOIN student_schedules ss ON t.id = ss.teacher_id
WHERE t.id = $1
GROUP BY t.id, t.name;

-- Get monthly trends
SELECT 
  DATE_TRUNC('month', attendance_date) as month,
  COUNT(CASE WHEN attendance_status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN attendance_status = 'absent' THEN 1 END) as absent
FROM student_schedules
WHERE teacher_id = $1
  AND attendance_date >= $2
  AND attendance_date <= $3
GROUP BY DATE_TRUNC('month', attendance_date)
ORDER BY month;
```

**`.env.example` Content:**
```env
# Database Configuration
NEON_DATABASE_URL=postgresql://neondb_owner:npg_QsOkV5ghj8dD@ep-raspy-fire-a1mkxdyl-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Cloudinary Configuration
CLOUDINARY_URL=cloudinary://252927275769619:0QungPQ1DalxpwHvJE1COjICbww@dnovxoaqi

# JWT Secrets (generate secure random strings)
JWT_SECRET=xEsuka2G6QaKiMjywMdCDP7Q7XpXNXDC
JWT_REFRESH_SECRET=9OTgLaf5fQOhf1kFDeliswJC4L2R4oAJ

# Cookie Domain (for httpOnly cookies)
COOKIE_DOMAIN=localhost
ALLOWED_ORIGIN=http://localhost:8888

# Environment
NODE_ENV=production
```
- Prepared statements for security
- **Soft delete implementation** with `is_active` field
- **Data preservation** for historical records
- **Query filtering** by active/inactive status

### State Management
- React Context for authentication
- Local state for UI components
- Custom hooks for data fetching
- Optimistic updates for better UX

### Responsive Design
- Mobile-first approach with Tailwind CSS
- Framer Motion for smooth animations
- Touch-friendly interface elements
- Responsive table layouts

### Performance Optimizations
- Lazy loading for images
- Virtual scrolling for large lists
- Memoization for expensive calculations
- Efficient database queries with proper indexing

### HTML Template Technical Details

#### Template Dependencies
- **Tailwind CSS**: For responsive styling and utility classes
- **Framer Motion**: For smooth animations and transitions
- **React 18**: For component-based architecture
- **Babel**: For JSX transformation in browser
- **Custom CSS**: For specific animations and effects

#### Color Palette & Design System
- **Primary Colors**: Warm yellow/amber palette for main actions
- **Secondary Colors**: Light purple/lavender for accents
- **Modern Design**: Clean, minimal interface with pleasant visual hierarchy
- **Eye-friendly**: Soft contrasts and comfortable color combinations

#### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // Warm yellow/amber palette
        primary: {
          50: '#fefce8',   // Lightest yellow
          100: '#fef3c7',  // Very light yellow
          200: '#fde68a',  // Light yellow
          300: '#fcd34d',  // Medium yellow
          400: '#fbbf24',  // Warm yellow
          500: '#f59e0b',  // Primary yellow
          600: '#d97706',  // Dark yellow
          700: '#b45309',  // Darker yellow
          800: '#92400e',  // Very dark yellow
          900: '#78350f',  // Darkest yellow
        },
        // Light purple/lavender palette
        secondary: {
          50: '#faf5ff',   // Lightest purple
          100: '#f3e8ff',  // Very light purple
          200: '#e9d5ff',  // Light purple
          300: '#d8b4fe',  // Medium purple
          400: '#c084fc',  // Light lavender
          500: '#a855f7',  // Primary purple
          600: '#9333ea',  // Medium purple
          700: '#7c3aed',  // Dark purple
          800: '#6b21a8',  // Darker purple
          900: '#581c87',  // Darkest purple
        },
        // Neutral grays for text and backgrounds
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Status colors
        success: '#10b981',  // Green for completed
        warning: '#f59e0b',  // Amber for pending
        error: '#ef4444',    // Red for absent/errors
        info: '#3b82f6',     // Blue for information
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        'pulse-gentle': 'pulseGentle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
    },
  },
}
```

#### Template Features
- **Responsive Design**: Mobile-first approach with breakpoints
- **Progressive Enhancement**: Works without JavaScript, enhanced with it
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Performance**: Lazy loading, optimized images, minimal bundle size
- **SEO**: Meta tags, semantic HTML, structured data

#### Component Styling Guidelines
- **Buttons**: Primary yellow (`bg-primary-500 hover:bg-primary-600`) with subtle animations
- **Cards**: Light backgrounds (`bg-neutral-50`) with purple accents (`border-secondary-200`)
- **Forms**: Clean inputs with purple focus states (`focus:ring-secondary-500`)
- **Status Indicators**: 
  - Completed: Green (`bg-success`)
  - Absent: Red (`bg-error`)
  - Scheduled: Gray (`bg-neutral-300`)
- **Navigation**: Purple accents (`text-secondary-600 hover:text-secondary-700`)

#### Animation Usage Rules
- **Clickable Elements Only**: Buttons, links, interactive cards
- **Subtle Animations**: Gentle transitions (0.2-0.3s duration)
- **Hover Effects**: Scale, color, or shadow changes
- **Loading States**: Gentle pulse animation
- **Success Actions**: Subtle bounce feedback
- **No Animations**: Static text, images, non-interactive elements

#### Animation Examples
```jsx
// Button with hover animation
<button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95">
  Click Me
</button>

// Card with hover effect
<div className="bg-neutral-50 border border-secondary-200 rounded-lg p-4 hover:shadow-lg transition-shadow duration-300 cursor-pointer">
  Teacher Card
</div>

// Status indicator with pulse
<div className="bg-success text-white px-2 py-1 rounded-full animate-pulse-gentle">
  Completed
</div>

// Modal with slide animation
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center animate-fade-in">
  <div className="bg-white rounded-lg p-6 animate-slide-up">
    Modal Content
  </div>
</div>
```

#### Template Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Meta tags, title, description -->
    <!-- Tailwind CSS CDN -->
    <!-- Framer Motion CDN -->
    <!-- React and ReactDOM CDN -->
    <!-- Babel for JSX transformation -->
    <!-- Custom CSS styles -->
</head>
<body>
    <!-- Main content structure -->
    <!-- React components will mount here -->
    <!-- Scripts for app initialization -->
</body>
</html>
```

#### Template Customization
- **Color Scheme**: Configurable via CSS variables
- **Typography**: Custom font loading and fallbacks
- **Animations**: Configurable animation durations and easing
- **Layout**: Flexible grid system with Tailwind
- **Components**: Modular React components for reusability

## Development Phases

### Phase 1: Setup & Authentication
1. Initialize React project with Vite (`npm create vite@latest lang-school -- --template react`)
2. Setup Tailwind CSS and Framer Motion
3. Install React Router for navigation
4. Setup Cloudinary account and install SDK
5. Create `.env.example` file with environment variables
6. Create `.env` file from `.env.example` with actual credentials
7. Configure Neon database connection
8. Implement authentication system with JWT
9. Create protected routes for admin/teacher

### Phase 2: Database & API
1. Design and create database schema
2. Setup Netlify functions for API endpoints
3. Implement Authentication API (`/api/auth`)
4. Implement Teachers API (`/api/teachers`)
5. Implement Students API (`/api/students`)
6. Implement Schedules API (`/api/schedules`)
7. Implement Cloudinary image upload functions
8. Add data validation and error handling

### Phase 3: Advanced Features
1. Implement Attendance API (`/api/attendance`)
2. Implement Lesson Reports API (`/api/reports`)
3. Implement Passwords API (`/api/passwords`)
4. Implement Content Management API (`/api/content`)
5. Implement Analytics API (`/api/analytics`)
6. Add bulk operations and data export

### Phase 7: Design System Implementation
1. Apply warm yellow/amber color palette to primary actions
2. Implement light purple/lavender accents throughout UI
3. Add modern animations to clickable elements only
4. Ensure eye-friendly contrast ratios
5. Test color accessibility compliance

## File Organization

### Images Folder Structure
```
public/pics/
├── teachers/
│   ├── teacher1.jpg
│   ├── teacher2.jpg
│   └── ...
├── courses/
│   ├── course1.jpg
│   ├── course2.jpg
│   └── ...
└── backgrounds/
    ├── mission-banner.jpg
    └── ...
```

### Environment Variables
```
VITE_NEON_DATABASE_URL=
VITE_JWT_SECRET=
VITE_API_BASE_URL=
```

## Security Considerations
- Password hashing with bcrypt
- JWT token expiration
- Input validation and sanitization
- SQL injection prevention
- CORS configuration
- Rate limiting for API endpoints

## Testing Strategy
- Unit tests for utility functions
- Integration tests for API endpoints
- Component testing with React Testing Library
- E2E testing for critical user flows

## Deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Build optimization completed
- [ ] Error monitoring setup
- [ ] Performance monitoring configured
- [ ] Backup strategy implemented

This plan provides a comprehensive roadmap for building your language school management system with all the specified features and requirements.
