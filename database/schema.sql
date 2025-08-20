-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  student_id VARCHAR(50) UNIQUE,
  university VARCHAR(255),
  major VARCHAR(255),
  year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_code VARCHAR(20) NOT NULL,
  course_title VARCHAR(255) NOT NULL,
  department VARCHAR(100),
  credits INTEGER,
  description TEXT,
  semester VARCHAR(20),
  year INTEGER,
  instructor VARCHAR(255),
  max_capacity INTEGER,
  current_enrollment INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_code, semester, year)
);

-- Time slots table
CREATE TABLE time_slots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments table
CREATE TABLE enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  enrollment_status VARCHAR(20) DEFAULT 'enrolled', -- enrolled, dropped, waitlist
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

-- Swap requests table
CREATE TABLE swap_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  requester_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  from_course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  desired_course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active', -- active, matched, cancelled, expired
  priority INTEGER DEFAULT 1, -- Higher number = higher priority
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days')
);

-- Swap matches table
CREATE TABLE swap_matches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  request_a_id UUID REFERENCES swap_requests(id) ON DELETE CASCADE,
  request_b_id UUID REFERENCES swap_requests(id) ON DELETE CASCADE,
  student_a_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_b_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  course_a_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  course_b_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  match_status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected, completed
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_student_id ON profiles(student_id);
CREATE INDEX idx_courses_code_semester ON courses(course_code, semester, year);
CREATE INDEX idx_time_slots_course_id ON time_slots(course_id);
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_swap_requests_requester ON swap_requests(requester_id);
CREATE INDEX idx_swap_requests_status ON swap_requests(status);
CREATE INDEX idx_swap_requests_courses ON swap_requests(from_course_id, desired_course_id);
CREATE INDEX idx_swap_matches_status ON swap_matches(match_status);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_matches ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Enrollments policies
CREATE POLICY "Users can view their own enrollments" ON enrollments
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Users can insert their own enrollments" ON enrollments
  FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Swap requests policies
CREATE POLICY "Users can view their own swap requests" ON swap_requests
  FOR SELECT USING (auth.uid() = requester_id);

CREATE POLICY "Users can create their own swap requests" ON swap_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own swap requests" ON swap_requests
  FOR UPDATE USING (auth.uid() = requester_id);

-- Swap matches policies
CREATE POLICY "Users can view matches they're involved in" ON swap_matches
  FOR SELECT USING (auth.uid() = student_a_id OR auth.uid() = student_b_id);

-- Public read access for courses and time_slots
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view courses" ON courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view time slots" ON time_slots FOR SELECT TO authenticated USING (true);

-- Functions and triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_swap_requests_updated_at BEFORE UPDATE ON swap_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();