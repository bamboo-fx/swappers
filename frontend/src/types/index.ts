export interface User {
  id: string;
  email: string;
  full_name?: string;
  student_id?: string;
  university?: string;
  major?: string;
  year?: number;
  phone_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Course {
  id: string;
  course_code: string;
  course_title: string;
  department?: string;
  credits?: number;
  description?: string;
  instructor?: string;
  max_capacity?: number;
  current_enrollment?: number;
  semester: string;
  year: number;
  time_slots?: TimeSlot[];
  created_at?: string;
  updated_at?: string;
}

export interface TimeSlot {
  id?: string;
  course_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location?: string;
  created_at?: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_status: 'enrolled' | 'waitlisted' | 'dropped';
  enrolled_at?: string;
  courses?: Course;
}

export interface SwapRequest {
  id: string;
  requester_id: string;
  from_course_id: string;
  desired_course_id: string;
  status: 'active' | 'matched' | 'completed' | 'cancelled' | 'expired';
  priority: number;
  notes?: string;
  created_at: string;
  expires_at?: string;
  from_course?: Course;
  desired_course?: Course;
  requester?: User;
}

export interface SwapMatch {
  id: string;
  student_a_id: string;
  student_b_id: string;
  course_a_id: string;
  course_b_id: string;
  match_status: 'pending' | 'confirmed' | 'rejected' | 'completed';
  matched_at: string;
  confirmed_at?: string;
  contact_shared_at?: string;
  completed_at?: string;
  student_a_confirmed: boolean;
  student_b_confirmed: boolean;
  student_a_completed: boolean;
  student_b_completed: boolean;
  request_a_id: string;
  request_b_id: string;
  student_a?: User;
  student_b?: User;
  course_a?: Course;
  course_b?: Course;
}

export interface ContactInfo {
  student_info: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string;
    student_id?: string;
  };
  match_info: {
    id: string;
    match_status: string;
    contact_shared_at: string;
  };
}

export interface Notification {
  type: 'new_match' | 'match_update' | 'request_update';
  message: string;
  data: any;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
} 