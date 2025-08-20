# SwapCourses Frontend

A React TypeScript frontend for the course swap platform.

## Features

- **Authentication**: Login, registration, and profile management
- **Course Management**: Browse courses, enroll/drop, import schedules via CSV
- **Swap System**: Create swap requests, view matches, confirm/reject swaps
- **Marketplace**: Browse available swap requests from other students
- **Real-time Notifications**: Get notified of new matches and updates
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- React 18 with TypeScript
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls
- React Hot Toast for notifications
- Heroicons for icons
- Supabase for real-time subscriptions

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment variables:**
   Copy `.env.example` to `.env` and update the values:
   ```bash
   cp .env.example .env
   ```

3. **Start development server:**
   ```bash
   npm start
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## Environment Variables

- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:3000)
- `REACT_APP_SUPABASE_URL`: Your Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY`: Your Supabase anonymous key

## Project Structure

```
src/
├── components/          # Reusable components
│   ├── Auth/           # Authentication components
│   └── Layout/         # Layout components
├── contexts/           # React contexts
├── pages/              # Page components
├── types/              # TypeScript type definitions
├── config/             # Configuration files
└── App.tsx             # Main app component
```

## Usage

1. **Register/Login**: Create an account or sign in
2. **Import Schedule**: Upload a CSV file with your current courses
3. **Browse Courses**: Search and enroll in available courses
4. **Create Swap Requests**: Request to swap courses you're enrolled in
5. **View Matches**: Check for potential swap matches
6. **Confirm Swaps**: Approve matches and exchange contact information
7. **Marketplace**: Browse requests from other students

## CSV Import Format

When importing your schedule, use a CSV file with these columns:
- `course_code`: Course code (e.g., "CS101")
- `course_title`: Course title
- `department`: Department abbreviation
- `instructor`: Instructor name
- `credits`: Number of credits
- `days`: Days of week (e.g., "MWF")
- `start_time`: Start time (e.g., "9:00 AM")
- `end_time`: End time (e.g., "10:00 AM")
- `location`: Room/location

## Available Scripts

- `npm start`: Start development server
- `npm build`: Build for production
- `npm test`: Run tests
- `npm run eject`: Eject from Create React App 