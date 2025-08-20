-- Database schema updates for contact exchange model
-- Run these commands in your Supabase SQL editor

-- Add new columns to swap_matches table for contact exchange
ALTER TABLE swap_matches 
ADD COLUMN IF NOT EXISTS student_a_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS student_b_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contact_shared_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS student_a_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS student_b_completed BOOLEAN DEFAULT false;

-- Add phone number to profiles table (optional)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- Update match_status values to include 'confirmed'
-- The existing values (pending, accepted, rejected, completed) will remain
-- 'accepted' is now renamed conceptually to 'confirmed' but we keep both for compatibility

-- Add index for faster queries on confirmation status
CREATE INDEX IF NOT EXISTS idx_swap_matches_confirmations 
ON swap_matches(student_a_confirmed, student_b_confirmed);

-- Create a view for confirmed matches with contact info
CREATE OR REPLACE VIEW confirmed_matches_with_contact AS
SELECT 
  sm.id as match_id,
  sm.match_status,
  sm.student_a_confirmed,
  sm.student_b_confirmed,
  sm.contact_shared_at,
  sm.student_a_completed,
  sm.student_b_completed,
  sm.matched_at,
  sm.completed_at,
  -- Student A info
  pa.id as student_a_id,
  pa.full_name as student_a_name,
  pa.email as student_a_email,
  pa.student_id as student_a_student_id,
  pa.phone_number as student_a_phone,
  -- Student B info  
  pb.id as student_b_id,
  pb.full_name as student_b_name,
  pb.email as student_b_email,
  pb.student_id as student_b_student_id,
  pb.phone_number as student_b_phone,
  -- Course A info
  ca.course_code as course_a_code,
  ca.course_title as course_a_title,
  -- Course B info
  cb.course_code as course_b_code,
  cb.course_title as course_b_title
FROM swap_matches sm
JOIN profiles pa ON sm.student_a_id = pa.id
JOIN profiles pb ON sm.student_b_id = pb.id
JOIN courses ca ON sm.course_a_id = ca.id
JOIN courses cb ON sm.course_b_id = cb.id
WHERE sm.match_status = 'confirmed';

-- Update RLS policies for the new view
ALTER TABLE swap_matches ENABLE ROW LEVEL SECURITY;

-- Allow users to view confirmed matches with contact info (only their own matches)
CREATE POLICY "Users can view confirmed match contact info" ON swap_matches
  FOR SELECT USING (
    match_status = 'confirmed' AND 
    (auth.uid() = student_a_id OR auth.uid() = student_b_id)
  );

-- Create function to automatically update match status when both students confirm
CREATE OR REPLACE FUNCTION update_match_status_on_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- If both students have confirmed, update status to 'confirmed'
  IF NEW.student_a_confirmed = true AND NEW.student_b_confirmed = true AND OLD.match_status = 'pending' THEN
    NEW.match_status = 'confirmed';
    NEW.contact_shared_at = NOW();
  END IF;
  
  -- If both students have completed, update status to 'completed'
  IF NEW.student_a_completed = true AND NEW.student_b_completed = true AND NEW.match_status = 'confirmed' THEN
    NEW.match_status = 'completed';
    NEW.completed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status updates
DROP TRIGGER IF EXISTS trigger_update_match_status ON swap_matches;
CREATE TRIGGER trigger_update_match_status
  BEFORE UPDATE ON swap_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_match_status_on_confirmation();

-- Add helpful comments to the table
COMMENT ON COLUMN swap_matches.student_a_confirmed IS 'Whether student A has confirmed the match';
COMMENT ON COLUMN swap_matches.student_b_confirmed IS 'Whether student B has confirmed the match';
COMMENT ON COLUMN swap_matches.contact_shared_at IS 'When contact information was shared between students';
COMMENT ON COLUMN swap_matches.student_a_completed IS 'Whether student A has marked the swap as completed';
COMMENT ON COLUMN swap_matches.student_b_completed IS 'Whether student B has marked the swap as completed';