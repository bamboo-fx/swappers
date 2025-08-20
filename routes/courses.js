const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireAuth } = require('../middleware/auth');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { importStudentSchedule } = require('../utils/courseImport');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

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

    let query = supabase
      .from('courses')
      .select(`
        id,
        course_code,
        course_title,
        department,
        credits,
        description,
        instructor,
        max_capacity,
        current_enrollment,
        semester,
        year,
        time_slots (
          day_of_week,
          start_time,
          end_time,
          location
        )
      `)
      .eq('semester', semester)
      .eq('year', parseInt(year));

    if (search) {
      query = query.or(`course_code.ilike.%${search}%,course_title.ilike.%${search}%`);
    }

    if (department) {
      query = query.eq('department', department);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: courses, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

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

router.post('/import', authenticateToken, requireAuth, upload.single('schedule'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const { semester = 'Fall', year = new Date().getFullYear() } = req.body;

    const result = await importStudentSchedule(
      req.file.path,
      req.user.id,
      semester,
      parseInt(year)
    );

    fs.unlinkSync(req.file.path);

    if (result.success) {
      res.json({
        message: 'Schedule imported successfully',
        importedCount: result.importedCount,
        courses: result.courses
      });
    } else {
      res.status(400).json({
        message: 'Import completed with errors',
        importedCount: result.importedCount,
        errors: result.errors
      });
    }

  } catch (error) {
    console.error('Error importing schedule:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
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

module.exports = router;