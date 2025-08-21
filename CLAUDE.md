# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SwapCourses is a course exchange platform built with a Node.js/Express backend and React/TypeScript frontend. The system enables students to swap course enrollments using intelligent matching algorithms, real-time notifications, and secure contact exchange.

## Development Commands

### Backend (Root Directory)
- `npm start` - Run production server
- `npm run dev` - Run development server with nodemon auto-restart
- `npm test` - Run all tests
- `npm run test:unit` - Run single unit test file (utils)
- `npm run test:unit-all` - Run all unit tests
- `npm run test:integration` - Run integration tests (requires INTEGRATION_TEST=true)
- `npm run test:e2e` - Run end-to-end tests (requires INTEGRATION_TEST=true)
- `npm run test:matching` - Run matching algorithm tests specifically
- `npm run test:manual` - Run manual test script
- `npm run test:all` - Run unit and integration tests sequentially

### Frontend (frontend/ Directory)
- `npm start` - Run development server (port 3001)
- `npm run build` - Build for production
- `npm test` - Run React tests
- `npm run eject` - Eject from Create React App

## Architecture

### Backend Structure
- **Express Server**: Main application server with CORS, Helmet security, and JSON parsing
- **Supabase Integration**: PostgreSQL database with authentication and real-time subscriptions
- **Matching Algorithm**: Intelligent course swap matching with time conflict detection (`services/matchingAlgorithm.js`)
- **Notification Service**: Real-time notifications using WebSocket endpoints (`services/notifications.js`)
- **Route Organization**: Modular API routes for auth, courses, and swaps

### Frontend Structure  
- **React 18 + TypeScript**: Modern component-based architecture
- **Tailwind CSS**: Utility-first styling framework
- **Context Management**: AuthContext and NotificationContext for global state
- **Component Organization**: Structured into Auth, Layout, and feature-specific components

### Database Schema
Key tables managed through Supabase:
- `profiles` - User information extending Supabase auth
- `courses` - Course catalog with time slots
- `enrollments` - Student course enrollments  
- `swap_requests` - Student swap requests
- `swap_matches` - Matched swap pairs
- `time_slots` - Course schedule information

### Key Features
- **Time Conflict Detection**: Prevents scheduling conflicts in matching algorithm
- **Priority-based Matching**: Higher priority requests matched first
- **CSV Import**: Schedule import functionality (`utils/courseImport.js`)
- **Real-time Updates**: WebSocket-based notifications for matches
- **Security**: JWT authentication, RLS policies, input validation

## Environment Setup

### Required Environment Variables
**Backend (.env)**:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NODE_ENV` - development/production
- `PORT` - Server port (default 3000)

**Frontend (frontend/.env)**:
- `REACT_APP_API_URL` - Backend API URL (http://localhost:3000)
- `REACT_APP_SUPABASE_URL` - Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` - Supabase anonymous key

### Database Setup
1. Execute `database/schema.sql` in Supabase SQL editor
2. Execute `database/schema_update.sql` for schema updates

## Testing Strategy

The project uses Jest with comprehensive test coverage:
- **Unit Tests**: Focus on utilities and matching algorithm logic
- **Integration Tests**: API endpoint testing with Supabase integration
- **E2E Tests**: Complete user journey testing
- **Manual Tests**: Script-based testing for complex scenarios

Test environment configured in `jest.config.js` with 30-second timeout and verbose output.

## Development Workflow

1. Backend runs on port 3000, frontend on port 3001
2. Frontend proxy configured to route API calls to backend
3. Use `npm run dev` for backend development with auto-restart
4. Real-time features require Supabase connection for WebSocket functionality
5. CSV import feature handles course schedule data in specific format