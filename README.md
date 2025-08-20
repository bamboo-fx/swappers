# SwapCourses - Course Exchange Platform

A comprehensive platform that allows students to exchange course enrollments with intelligent matching algorithms, real-time notifications, and a modern web interface.

## 🚀 Features

### Backend (Node.js/Express)
- **Authentication System**: Secure user registration, login, and profile management using Supabase Auth
- **Course Management**: Browse courses, enroll/drop, import schedules via CSV
- **Intelligent Swap Matching**: Automated matching algorithm considering time conflicts and priorities
- **Real-time Notifications**: WebSocket-based notifications for matches and updates
- **Contact Exchange**: Secure contact information sharing after swap confirmation
- **RESTful API**: Comprehensive API with proper error handling and validation

### Frontend (React/TypeScript)
- **Modern UI**: Beautiful, responsive interface built with Tailwind CSS
- **Real-time Updates**: Live notifications and status updates
- **Course Discovery**: Advanced search and filtering capabilities
- **Swap Management**: Complete workflow from request creation to completion
- **Marketplace**: Browse and contact other students' swap requests
- **Mobile Responsive**: Works seamlessly on all devices

## 🛠 Tech Stack

### Backend
- Node.js with Express.js
- Supabase (PostgreSQL + Auth + Realtime)
- CSV parsing for schedule imports
- CORS and security headers
- File upload handling

### Frontend  
- React 18 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Axios for API communication
- React Hot Toast for notifications
- Heroicons for icons
- Supabase client for real-time subscriptions

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Git

## 🚀 Quick Start

### 1. Clone and Setup Backend

```bash
# Clone the repository
git clone <your-repo-url>
cd swappers

# Install backend dependencies
npm install

# Create environment file
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your Supabase credentials:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NODE_ENV=development
PORT=3000
```

### 3. Setup Database

Run the SQL files in your Supabase SQL editor:

1. **Base Schema**: Execute `database/schema.sql`
2. **Schema Updates**: Execute `database/schema_update.sql`

### 4. Start Backend Server

```bash
# Development mode with auto-restart
npm run dev

# Or production mode
npm start
```

The backend will be available at `http://localhost:3000`

### 5. Setup Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install frontend dependencies
npm install

# Create environment file
cp .env.example .env
```

Edit `frontend/.env`:

```bash
REACT_APP_API_URL=http://localhost:3000
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 6. Start Frontend

```bash
# Start development server
npm start
```

The frontend will be available at `http://localhost:3001`

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Course Endpoints
- `GET /api/courses` - List courses with filters
- `GET /api/courses/enrolled` - Get user's enrolled courses
- `GET /api/courses/departments` - Get available departments
- `POST /api/courses/import` - Import schedule from CSV
- `POST /api/courses/enroll/:courseId` - Enroll in course
- `DELETE /api/courses/enroll/:courseId` - Drop course

### Swap Endpoints
- `GET /api/swaps/requests` - Get user's swap requests
- `POST /api/swaps/requests` - Create new swap request
- `PUT /api/swaps/requests/:id` - Update swap request
- `DELETE /api/swaps/requests/:id` - Cancel swap request
- `GET /api/swaps/matches` - Get user's matches
- `POST /api/swaps/matches/:id/confirm` - Confirm match
- `POST /api/swaps/matches/:id/reject` - Reject match
- `GET /api/swaps/matches/:id/contact` - Get contact info
- `POST /api/swaps/matches/:id/complete` - Mark swap complete
- `GET /api/swaps/marketplace` - Browse public swap requests

## 💾 Database Schema

### Core Tables
- `profiles`: User information extending Supabase auth
- `courses`: Course catalog with time slots
- `enrollments`: Student course enrollments
- `swap_requests`: Swap requests from students
- `swap_matches`: Matched swap pairs
- `time_slots`: Course schedule information

### Key Features
- **Time Conflict Detection**: Prevents scheduling conflicts
- **Priority-based Matching**: Higher priority requests matched first
- **Contact Exchange**: Secure sharing after confirmation
- **Audit Trail**: Track all swap activities

## 📱 Usage Guide

### For Students

1. **Registration**: Create account with student information
2. **Import Schedule**: Upload CSV with current courses
3. **Create Swap Requests**: Select courses to swap
4. **Review Matches**: Check potential matches
5. **Confirm Swaps**: Approve matches and get contact info
6. **Complete Swaps**: Mark as done after real-world exchange

### CSV Import Format

Create a CSV file with these columns:
```
course_code,course_title,department,instructor,credits,days,start_time,end_time,location
CS101,Intro to Computer Science,CS,Dr. Smith,3,MWF,9:00 AM,10:00 AM,Room 101
```

### Supported Time Formats
- `9:00 AM`, `2:30 PM`
- `09:00`, `14:30`
- Days: `M`, `T`, `W`, `R` (Thursday), `F`, `S` (Saturday), `U` (Sunday)

## 🔒 Security Features

- JWT-based authentication
- Row Level Security (RLS) policies
- Input validation and sanitization
- CORS protection
- Rate limiting ready
- Secure file upload handling

## 🚀 Deployment

### Backend Deployment (Heroku/Railway/DigitalOcean)

1. Set environment variables in your hosting platform
2. Ensure Node.js version compatibility
3. Configure production CORS origins
4. Set `NODE_ENV=production`

### Frontend Deployment (Vercel/Netlify)

1. Build the project: `npm run build`
2. Set environment variables in hosting platform
3. Configure redirect rules for SPA routing
4. Deploy the `build` folder

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support, please create an issue in the repository or contact the development team.

## 🔮 Future Enhancements

- Mobile app (React Native)
- Push notifications
- Course waitlist management
- Advanced analytics dashboard
- Integration with university systems
- AI-powered recommendations

---

Built with ❤️ for students, by students.