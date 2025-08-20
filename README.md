# Course Swapper API

A comprehensive backend API for a student course marketplace that enables course schedule importing and intelligent swap matching between students. **This is a contact exchange platform** - students find compatible matches and exchange contact information to coordinate course swaps through their school's official enrollment system.

## Features

- **User Authentication**: Secure registration/login using Supabase Auth with profile management
- **Course Import**: CSV-based bulk course schedule import with validation
- **Intelligent Matching**: Automatic detection of mutual course swap opportunities with conflict checking
- **Contact Exchange**: Secure sharing of contact information (email, phone) after mutual confirmation
- **Real-time Notifications**: Live updates for swap matches using Supabase subscriptions  
- **Marketplace**: Browse and search available course swap requests from other students
- **Schedule Conflict Detection**: Validates time conflicts to ensure viable swaps
- **Priority System**: Weighted matching based on student preferences and request timing
- **Manual Completion Tracking**: Students mark swaps as completed after coordinating through school systems

## Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT
- **Real-time**: Supabase Realtime subscriptions
- **File Processing**: CSV parsing with validation

## Setup Instructions

### 1. Prerequisites
- Node.js (v16 or higher)
- Supabase account and project

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd swappers

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 3. Environment Configuration

Edit `.env` file with your Supabase credentials:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3000
NODE_ENV=development
```

### 4. Database Setup

1. Go to your Supabase project dashboard
2. Open the SQL Editor
3. Run the SQL commands from `database/schema.sql` to create the initial schema
4. **IMPORTANT**: Also run `database/schema_update.sql` for the contact exchange features
5. Verify all tables, policies, and triggers are created correctly

> **Note**: The schema update adds contact exchange functionality including confirmation tracking and phone number support.

### 5. Run the Application

```bash
# Development mode with hot reloading
npm run dev

# Production mode
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/refresh` - Refresh authentication token

### Courses
- `GET /api/courses` - List all courses with filtering
- `GET /api/courses/enrolled` - Get current user's enrolled courses
- `GET /api/courses/departments` - List available departments
- `POST /api/courses/import` - Import course schedule from CSV
- `POST /api/courses/enroll/:courseId` - Enroll in a course
- `DELETE /api/courses/enroll/:courseId` - Drop a course

### Swap System
- `GET /api/swaps/requests` - List user's swap requests
- `POST /api/swaps/requests` - Create a new swap request (auto-matches if possible)
- `PUT /api/swaps/requests/:requestId` - Update a swap request
- `DELETE /api/swaps/requests/:requestId` - Cancel a swap request
- `GET /api/swaps/matches` - List user's swap matches
- `POST /api/swaps/matches/:matchId/confirm` - Confirm a match (reveals contact info when both confirm)
- `POST /api/swaps/matches/:matchId/reject` - Reject a swap match
- `GET /api/swaps/matches/:matchId/contact` - Get contact information for confirmed match
- `POST /api/swaps/matches/:matchId/complete` - Mark swap as completed after coordinating with school
- `GET /api/swaps/marketplace` - Browse marketplace swap requests

### Real-time Notifications
- `GET /api/notifications/subscribe/matches` - Subscribe to swap match updates
- `GET /api/notifications/subscribe/requests` - Subscribe to swap request updates
- `GET /api/notifications/subscribe/opportunities` - Subscribe to new opportunities
- `GET /api/notifications/subscribe/marketplace` - Subscribe to marketplace updates

## CSV Import Format

When importing course schedules, use this CSV format:

```csv
course_code,course_title,department,credits,instructor,days,start_time,end_time,location,description
CS101,Introduction to Computer Science,Computer Science,3,Dr. Smith,MWF,9:00 AM,10:00 AM,Room 101,Basic programming concepts
MATH201,Calculus II,Mathematics,4,Prof. Johnson,TR,11:00 AM,12:30 PM,Room 205,Advanced calculus topics
```

### Required Fields
- `course_code`: Unique course identifier
- `course_title`: Full course name

### Optional Fields
- `department`: Academic department
- `credits`: Credit hours (number)
- `instructor`: Teacher name
- `days`: Days of week (M,T,W,R,F,S,U format)
- `start_time`: Class start time (12-hour format)
- `end_time`: Class end time (12-hour format)  
- `location`: Classroom/building
- `description`: Course description

## Database Schema

### Key Tables
- **profiles**: Extended user information
- **courses**: Course catalog with metadata
- **time_slots**: Class scheduling information
- **enrollments**: Student course registrations
- **swap_requests**: Course swap requests from students
- **swap_matches**: Successful matches between students

### Relationships
- Users can have multiple enrollments and swap requests
- Courses can have multiple time slots and enrollments
- Swap requests can be matched with other requests
- Matches track the swap process from pending to completed

## How the Contact Exchange System Works

The course swapper operates as a **matching and contact exchange platform**:

### Matching Algorithm
1. **Mutual Matching**: Finds students where A wants B's course and B wants A's course
2. **Schedule Validation**: Checks for time conflicts in both students' schedules
3. **Priority Scoring**: Ranks matches by priority level and request timing
4. **Real-time Processing**: Automatically processes new requests for immediate matches
5. **Batch Processing**: Periodic optimization for best overall matches

### Contact Exchange Flow
1. **Match Discovery**: System finds compatible swap partners automatically
2. **Mutual Confirmation**: Both students must confirm the match
3. **Contact Sharing**: After both confirm, email and phone numbers are exchanged
4. **Student Coordination**: Students contact each other directly to coordinate the swap
5. **School Enrollment**: Students handle actual course enrollment changes through their school's system
6. **Completion Tracking**: Students mark the swap as completed in the app

### Key Benefits
- **No Enrollment Management**: App doesn't modify school enrollment records
- **Student Control**: Students maintain full control over their course changes
- **Verified Matches**: Only shows viable swaps (no schedule conflicts)
- **Secure Contact Exchange**: Contact info only shared after mutual agreement
- **School System Compatibility**: Works with any school's enrollment system

## Error Handling

The API includes comprehensive error handling:
- Input validation with detailed error messages
- Database constraint validation
- Authentication and authorization checks
- File upload validation and limits
- Graceful handling of Supabase connection issues

## Testing

The project includes a comprehensive testing suite:

### Available Test Commands
```bash
# Run all unit tests
npm run test:unit

# Run integration tests (requires running server)
npm run test:integration

# Run end-to-end tests (requires running server)
npm run test:e2e

# Run manual API test script
npm run test:manual

# Run specific matching algorithm tests
npm run test:matching

# Run all tests
npm run test:all
```

### Quick Manual Testing

For quick API testing, run the automated test script:
```bash
# Start the server first
npm run dev

# In another terminal, run manual tests
npm run test:manual
```

Or test endpoints manually with curl:
```bash
# Health check
curl http://localhost:3000/health

# Register a new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","fullName":"Test User"}'
```

### Testing the Complete User Journey
The E2E tests simulate the complete flow:
1. User registration and authentication
2. Course schedule import via CSV
3. Creating swap requests
4. Automatic matching detection
5. Match confirmation and contact exchange
6. Completion tracking

## Production Deployment

1. Set `NODE_ENV=production`
2. Update CORS origins in server.js
3. Configure proper SSL certificates
4. Set up monitoring and logging
5. Configure backup strategy for Supabase database
6. Implement rate limiting for API endpoints

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details