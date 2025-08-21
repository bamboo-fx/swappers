-- Schema updates for Hyperschedule integration and manual course selection

-- Add hyperschedule_id to courses table for tracking
ALTER TABLE courses ADD COLUMN IF NOT EXISTS hyperschedule_id VARCHAR(100);

-- Create index for hyperschedule_id lookups
CREATE INDEX IF NOT EXISTS idx_courses_hyperschedule_id ON courses(hyperschedule_id);

-- Create course_requests table for students to request courses they want
CREATE TABLE IF NOT EXISTS course_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  requested_course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1, -- Higher number = higher priority
  notes TEXT,
  status VARCHAR(20) DEFAULT 'active', -- active, matched, cancelled, expired
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  UNIQUE(student_id, requested_course_id)
);

-- Add indexes for course_requests
CREATE INDEX IF NOT EXISTS idx_course_requests_student_id ON course_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_course_requests_course_id ON course_requests(requested_course_id);
CREATE INDEX IF NOT EXISTS idx_course_requests_status ON course_requests(status);

-- Enable RLS for course_requests
ALTER TABLE course_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for course_requests
CREATE POLICY "Users can view their own course requests" ON course_requests
  FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Users can create their own course requests" ON course_requests
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Users can update their own course requests" ON course_requests
  FOR UPDATE USING (auth.uid() = student_id);

CREATE POLICY "Users can delete their own course requests" ON course_requests
  FOR DELETE USING (auth.uid() = student_id);

-- Add trigger for updated_at timestamp on course_requests
CREATE TRIGGER update_course_requests_updated_at BEFORE UPDATE ON course_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update swap_requests table to support course requests (optional from_course for pure requests)
ALTER TABLE swap_requests ALTER COLUMN from_course_id DROP NOT NULL;

-- Add course_request_id to link swap requests with course requests
ALTER TABLE swap_requests ADD COLUMN IF NOT EXISTS course_request_id UUID REFERENCES course_requests(id) ON DELETE SET NULL;

-- Create index for course_request_id
CREATE INDEX IF NOT EXISTS idx_swap_requests_course_request ON swap_requests(course_request_id);

-- Create a view for marketplace that shows available swaps and requests
CREATE OR REPLACE VIEW marketplace_view AS
SELECT 
  'swap' as type,
  sr.id,
  sr.requester_id,
  p.full_name as requester_name,
  fc.course_code as offering_course_code,
  fc.course_title as offering_course_title,
  fc.department as offering_department,
  fc.instructor as offering_instructor,
  dc.course_code as wanting_course_code,
  dc.course_title as wanting_course_title,
  dc.department as wanting_department,
  dc.instructor as wanting_instructor,
  sr.priority,
  sr.notes,
  sr.created_at,
  sr.expires_at,
  -- Time slots for offering course
  (
    SELECT json_agg(
      json_build_object(
        'day_of_week', ts.day_of_week,
        'start_time', ts.start_time,
        'end_time', ts.end_time,
        'location', ts.location
      )
    )
    FROM time_slots ts WHERE ts.course_id = fc.id
  ) as offering_time_slots,
  -- Time slots for wanted course
  (
    SELECT json_agg(
      json_build_object(
        'day_of_week', ts.day_of_week,
        'start_time', ts.start_time,
        'end_time', ts.end_time,
        'location', ts.location
      )
    )
    FROM time_slots ts WHERE ts.course_id = dc.id
  ) as wanting_time_slots
FROM swap_requests sr
JOIN profiles p ON sr.requester_id = p.id
JOIN courses fc ON sr.from_course_id = fc.id
JOIN courses dc ON sr.desired_course_id = dc.id
WHERE sr.status = 'active'

UNION ALL

SELECT 
  'request' as type,
  cr.id,
  cr.student_id as requester_id,
  p.full_name as requester_name,
  NULL as offering_course_code,
  NULL as offering_course_title,
  NULL as offering_department,
  NULL as offering_instructor,
  c.course_code as wanting_course_code,
  c.course_title as wanting_course_title,
  c.department as wanting_department,
  c.instructor as wanting_instructor,
  cr.priority,
  cr.notes,
  cr.created_at,
  cr.expires_at,
  NULL as offering_time_slots,
  -- Time slots for requested course
  (
    SELECT json_agg(
      json_build_object(
        'day_of_week', ts.day_of_week,
        'start_time', ts.start_time,
        'end_time', ts.end_time,
        'location', ts.location
      )
    )
    FROM time_slots ts WHERE ts.course_id = c.id
  ) as wanting_time_slots
FROM course_requests cr
JOIN profiles p ON cr.student_id = p.id
JOIN courses c ON cr.requested_course_id = c.id
WHERE cr.status = 'active';

-- Grant permissions on the view
GRANT SELECT ON marketplace_view TO authenticated;