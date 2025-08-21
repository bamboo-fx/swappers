const express = require('express');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { supabase, supabaseAdmin } = require('../config/supabase');
const hyperscheduleService = require('../services/hyperscheduleService');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      search, 
      department, 
      semester = 'Fall', 
      year = new Date().getFullYear(),
      page = 1,
      limit = 50 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const courses = await hyperscheduleService.searchCourses(search, {
      department,
      semester,
      year,
      limit: parseInt(limit),
      offset
    });

    res.json({
      courses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: courses.length
      }
    });

  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/enrolled', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        enrollment_status,
        enrolled_at,
        courses (
          id,
          course_code,
          course_title,
          department,
          credits,
          instructor,
          semester,
          year,
          time_slots (
            day_of_week,
            start_time,
            end_time,
            location
          )
        )
      `)
      .eq('student_id', req.user.id)
      .eq('enrollment_status', 'enrolled');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ enrollments });

  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/departments', authenticateToken, async (req, res) => {
  try {
    const { data: departments, error } = await supabase
      .from('courses')
      .select('department')
      .not('department', 'is', null)
      .order('department');

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const uniqueDepartments = [...new Set(departments.map(d => d.department))];
    res.json({ departments: uniqueDepartments });

  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/enroll/:courseId', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;

    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', req.user.id)
      .eq('course_id', courseId)
      .single();

    if (existingEnrollment) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('max_capacity, current_enrollment')
      .eq('id', courseId)
      .single();

    if (courseError) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.max_capacity && course.current_enrollment >= course.max_capacity) {
      return res.status(400).json({ error: 'Course is at maximum capacity' });
    }

    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .insert({
        student_id: req.user.id,
        course_id: courseId,
        enrollment_status: 'enrolled'
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await supabaseAdmin
      .from('courses')
      .update({ 
        current_enrollment: course.current_enrollment + 1 
      })
      .eq('id', courseId);

    res.status(201).json({ 
      message: 'Successfully enrolled in course',
      enrollment 
    });

  } catch (error) {
    console.error('Error enrolling in course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/enroll/:courseId', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;

    const { data: enrollment, error: fetchError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', req.user.id)
      .eq('course_id', courseId)
      .eq('enrollment_status', 'enrolled')
      .single();

    if (fetchError || !enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    const { error } = await supabase
      .from('enrollments')
      .update({ enrollment_status: 'dropped' })
      .eq('id', enrollment.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data: course } = await supabase
      .from('courses')
      .select('current_enrollment')
      .eq('id', courseId)
      .single();

    if (course && course.current_enrollment > 0) {
      await supabaseAdmin
        .from('courses')
        .update({ 
          current_enrollment: course.current_enrollment - 1 
        })
        .eq('id', courseId);
    }

    res.json({ message: 'Successfully dropped course' });

  } catch (error) {
    console.error('Error dropping course:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Course requests endpoints
router.get('/requests', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { data: requests, error } = await supabase
      .from('course_requests')
      .select(`
        id,
        priority,
        notes,
        status,
        created_at,
        expires_at,
        courses (
          id,
          course_code,
          course_title,
          department,
          credits,
          instructor,
          semester,
          year,
          time_slots (
            day_of_week,
            start_time,
            end_time,
            location
          )
        )
      `)
      .eq('student_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ requests });

  } catch (error) {
    console.error('Error fetching course requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/requests', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { courseId, priority = 1, notes } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, course_code, course_title')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if student is already enrolled in this course
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', req.user.id)
      .eq('course_id', courseId)
      .eq('enrollment_status', 'enrolled')
      .single();

    if (existingEnrollment) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('course_requests')
      .select('id')
      .eq('student_id', req.user.id)
      .eq('requested_course_id', courseId)
      .eq('status', 'active')
      .single();

    if (existingRequest) {
      return res.status(400).json({ error: 'Course request already exists' });
    }

    const { data: request, error } = await supabase
      .from('course_requests')
      .insert({
        student_id: req.user.id,
        requested_course_id: courseId,
        priority: parseInt(priority),
        notes
      })
      .select(`
        id,
        priority,
        notes,
        status,
        created_at,
        expires_at,
        courses (
          id,
          course_code,
          course_title,
          department,
          instructor
        )
      `)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ 
      message: 'Course request created successfully',
      request 
    });

  } catch (error) {
    console.error('Error creating course request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/requests/:requestId', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { priority, notes, status } = req.body;

    const updateData = {};
    if (priority !== undefined) updateData.priority = parseInt(priority);
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    const { data: request, error } = await supabase
      .from('course_requests')
      .update(updateData)
      .eq('id', requestId)
      .eq('student_id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!request) {
      return res.status(404).json({ error: 'Course request not found' });
    }

    res.json({ 
      message: 'Course request updated successfully',
      request 
    });

  } catch (error) {
    console.error('Error updating course request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/requests/:requestId', authenticateToken, requireAuth, async (req, res) => {
  try {
    const { requestId } = req.params;

    const { error } = await supabase
      .from('course_requests')
      .delete()
      .eq('id', requestId)
      .eq('student_id', req.user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Course request deleted successfully' });

  } catch (error) {
    console.error('Error deleting course request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Hyperschedule sync endpoint (admin only for now)
router.post('/sync-hyperschedule', authenticateToken, async (req, res) => {
  try {
    const { school = 'hmc' } = req.body;

    console.log(`Starting Hyperschedule sync for school: ${school}`);
    const result = await hyperscheduleService.syncAllCourses(school);

    res.json({
      message: 'Hyperschedule sync completed',
      ...result
    });

  } catch (error) {
    console.error('Error syncing with Hyperschedule:', error);
    res.status(500).json({ 
      error: 'Failed to sync with Hyperschedule',
      details: error.message 
    });
  }
});

module.exports = router;