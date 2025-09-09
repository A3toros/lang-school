# Language School Management System

A comprehensive React-based web application for managing teacher-student communication and scheduling, deployed on Netlify with Neon PostgreSQL database.

## 🚀 Features

### Admin Dashboard
- **Teacher Management** - Add, edit, delete, and manage teacher accounts
- **Student Management** - Complete student lifecycle with filtering and pagination
- **Schedule Management** - Interactive weekly schedule with attendance tracking
- **Content Management** - Mission content, courses, and teacher showcase configuration
- **Password Management** - View and change teacher passwords
- **Attendance Tracking** - Mark lessons as completed/absent with color coding
- **Statistics Dashboard** - Real-time attendance and performance metrics

### Teacher Dashboard
- **Personal Schedule** - View own schedule with attendance marking
- **Lesson Reporting** - Write comments for student lessons
- **Statistics View** - Personal attendance and performance stats
- **Week Navigation** - Easy week-to-week navigation

### Login Page
- **Dynamic Content** - API-driven teacher showcase and courses
- **Interactive Carousel** - Course navigation with detailed modals
- **Mission Display** - Dynamic mission content with banner support
- **Responsive Design** - Mobile-optimized layout

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Framer Motion
- **Backend**: Netlify Functions (Serverless)
- **Database**: Neon PostgreSQL
- **Authentication**: JWT tokens with role-based access
- **Image Management**: Cloudinary CDN
- **Deployment**: Netlify

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd lang-school
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   # Database Configuration
   NEON_DATABASE_URL=your_neon_database_url
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   
   # JWT Secrets
   JWT_SECRET=your_jwt_secret
   JWT_REFRESH_SECRET=your_jwt_refresh_secret
   
   # CORS Configuration
   ALLOWED_ORIGIN=http://localhost:8888
   COOKIE_DOMAIN=localhost
   
   # Environment
   NODE_ENV=development
   ```

4. **Set up the database**
   ```bash
   # Run the SQL schema in your Neon database
   psql $NEON_DATABASE_URL -f db-schema.sql
   ```

## 🚀 Development

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Run tests**
   ```bash
   npm test
   npm run test:coverage
   ```

3. **Lint and format code**
   ```bash
   npm run lint
   npm run format
   ```

## 🚀 Deployment

### Netlify Deployment

1. **Connect to Netlify**
   - Connect your GitHub repository to Netlify
   - The `netlify.toml` file will configure the build settings

2. **Set environment variables in Netlify**
   - Go to Site settings > Environment variables
   - Add all the environment variables from `.env.example`

3. **Deploy**
   - Netlify will automatically build and deploy on every push to main
   - Functions will be deployed to `/.netlify/functions/`

### Manual Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy to Netlify**
   ```bash
   npx netlify deploy --prod --dir=dist
   ```

## 📊 Database Schema

The application uses a PostgreSQL database with the following main tables:

- **teachers** - Teacher information and photos
- **students** - Student information and assignments
- **users** - Authentication and user management
- **student_schedules** - Weekly schedule assignments
- **lesson_reports** - Teacher comments for lessons
- **courses** - Course information for carousel
- **mission_content** - Mission statement and banner

## 🔐 Authentication

The application uses JWT tokens with a dual token system:

- **Access Token** (30 minutes) - For API authentication
- **Refresh Token** (7 days) - For renewing access tokens
- **Role-based Access** - Admin and Teacher roles
- **Automatic Refresh** - Tokens refresh automatically before expiration

## 🎨 Design System

- **Primary Colors**: Warm yellow/amber palette
- **Secondary Colors**: Light purple/lavender accents
- **Typography**: Clean, modern fonts with proper hierarchy
- **Animations**: Framer Motion for smooth interactions
- **Responsive**: Mobile-first design with breakpoints

## 📱 Responsive Design

- **Desktop** (1024px+): Full table layouts with all features
- **Tablet** (720px): Compact layouts with reduced padding
- **Mobile** (480px): Condensed layouts with touch-friendly interactions

## 🧪 Testing

The application includes comprehensive testing:

- **Unit Tests** - Component and utility function tests
- **Integration Tests** - API and user flow tests
- **E2E Tests** - Complete user journey tests
- **Coverage Reports** - Detailed test coverage analysis

Run tests with:
```bash
npm test                 # Run all tests
npm run test:ui         # Run tests with UI
npm run test:coverage   # Run tests with coverage
```

## 📁 Project Structure

```
lang-school/
├── src/
│   ├── components/
│   │   ├── admin/          # Admin dashboard components
│   │   ├── teacher/        # Teacher dashboard components
│   │   ├── login/          # Login page components
│   │   └── common/         # Shared components
│   ├── pages/              # Main page components
│   ├── context/            # React context providers
│   ├── utils/              # Utility functions and API service
│   └── __tests__/          # Test files
├── functions/              # Netlify Functions (Backend API)
├── pics/                   # Image assets
├── db-schema.sql          # Database schema
└── netlify.toml           # Netlify configuration
```

## 🔧 API Endpoints

The application provides 120+ API endpoints:

- **Authentication** (`/api/auth`) - Login, logout, token management
- **Teachers** (`/api/teachers`) - Teacher CRUD operations
- **Students** (`/api/students`) - Student management
- **Schedules** (`/api/schedules`) - Schedule management
- **Attendance** (`/api/attendance`) - Attendance tracking
- **Reports** (`/api/reports`) - Lesson reports
- **Content** (`/api/content`) - Content management
- **Cloudinary** (`/api/cloudinary`) - Image upload and management

## 🚀 Performance Optimizations

- **Code Splitting** - Lazy loading for better performance
- **Image Optimization** - Cloudinary CDN with automatic optimization
- **Caching** - Efficient data caching strategies
- **Bundle Optimization** - Optimized build with tree shaking

## 🔒 Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-based Access** - Granular permission system
- **Input Validation** - Client and server-side validation
- **SQL Injection Prevention** - Parameterized queries
- **CORS Configuration** - Proper cross-origin resource sharing

## 📈 Monitoring and Analytics

- **Error Tracking** - Comprehensive error logging
- **Performance Monitoring** - Real-time performance metrics
- **User Analytics** - Usage patterns and insights

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the test files for usage examples

## 🎯 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Video lesson integration
- [ ] Payment processing
- [ ] Email notifications
- [ ] Calendar integration

---

**Built with ❤️ using React, Tailwind CSS, and modern web technologies.**