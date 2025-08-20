const csv = require('csv-parser');
const fs = require('fs');
const { supabaseAdmin } = require('../config/supabase');

const parseTimeString = (timeStr) => {
  if (!timeStr) return null;
  
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return null;
  
  let [, hours, minutes, period] = match;
  hours = parseInt(hours);
  minutes = parseInt(minutes);
  
  // Validate hours and minutes
  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }
  
  if (period && period.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period && period.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
};

const parseDaysOfWeek = (daysStr) => {
  if (!daysStr) return [];
  
  const dayMap = {
    'M': 1, 'T': 2, 'W': 3, 'R': 4, 'F': 5, 'S': 6, 'U': 0
  };
  
  const days = [];
  for (let char of daysStr.toUpperCase()) {
    if (dayMap[char] !== undefined) {
      days.push(dayMap[char]);
    }
  }
  
  return days;
};

const validateCourseData = (course) => {
  const errors = [];
  
  if (!course.course_code || course.course_code.trim() === '') {
    errors.push('Course code is required');
  }
  
  if (!course.course_title || course.course_title.trim() === '') {
    errors.push('Course title is required');
  }
  
  if (course.credits && (isNaN(course.credits) || course.credits < 0 || course.credits > 20)) {
    errors.push('Credits must be a number between 0 and 20');
  }
  
  if (course.year && (isNaN(course.year) || course.year < 2020 || course.year > 2030)) {
    errors.push('Year must be between 2020 and 2030');
  }
  
  if (course.max_capacity && (isNaN(course.max_capacity) || course.max_capacity < 1)) {
    errors.push('Max capacity must be a positive number');
  }
  
  return errors;
};

const validateTimeSlotData = (timeSlot) => {
  const errors = [];
  
  if (!timeSlot.start_time) {
    errors.push('Start time is required');
  }
  
  if (!timeSlot.end_time) {
    errors.push('End time is required');
  }
  
  if (timeSlot.start_time && timeSlot.end_time && timeSlot.start_time >= timeSlot.end_time) {
    errors.push('End time must be after start time');
  }
  
  if (timeSlot.day_of_week === undefined || timeSlot.day_of_week < 0 || timeSlot.day_of_week > 6) {
    errors.push('Invalid day of week');
  }
  
  return errors;
};

const importCoursesFromCSV = async (filePath, semester = 'Fall', year = 2024) => {
  return new Promise((resolve, reject) => {
    const courses = [];
    const errors = [];
    let lineNumber = 1;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        lineNumber++;
        
        try {
          const courseData = {
            course_code: row.course_code || row.code || row.Course_Code || row.Code,
            course_title: row.course_title || row.title || row.Course_Title || row.Title,
            department: row.department || row.Department,
            credits: row.credits ? parseInt(row.credits) : null,
            description: row.description || row.Description,
            instructor: row.instructor || row.Instructor,
            max_capacity: row.max_capacity ? parseInt(row.max_capacity) : null,
            semester,
            year
          };
          
          const validationErrors = validateCourseData(courseData);
          if (validationErrors.length > 0) {
            errors.push(`Line ${lineNumber}: ${validationErrors.join(', ')}`);
            return;
          }
          
          const timeSlots = [];
          const days = parseDaysOfWeek(row.days || row.Days);
          const startTime = parseTimeString(row.start_time || row.Start_Time);
          const endTime = parseTimeString(row.end_time || row.End_Time);
          const location = row.location || row.Location;
          
          if (days.length > 0 && startTime && endTime) {
            for (let day of days) {
              const timeSlotData = {
                day_of_week: day,
                start_time: startTime,
                end_time: endTime,
                location
              };
              
              const timeSlotErrors = validateTimeSlotData(timeSlotData);
              if (timeSlotErrors.length > 0) {
                errors.push(`Line ${lineNumber} time slot: ${timeSlotErrors.join(', ')}`);
                continue;
              }
              
              timeSlots.push(timeSlotData);
            }
          }
          
          courses.push({ courseData, timeSlots });
          
        } catch (error) {
          errors.push(`Line ${lineNumber}: Error parsing data - ${error.message}`);
        }
      })
      .on('end', () => {
        resolve({ courses, errors });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

const saveCourseToDatabase = async (courseData, timeSlots, userId) => {
  try {
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .insert(courseData)
      .select()
      .single();
      
    if (courseError) {
      throw new Error(`Course insert error: ${courseError.message}`);
    }
    
    if (timeSlots && timeSlots.length > 0) {
      const timeSlotsWithCourseId = timeSlots.map(slot => ({
        ...slot,
        course_id: course.id
      }));
      
      const { error: timeSlotsError } = await supabaseAdmin
        .from('time_slots')
        .insert(timeSlotsWithCourseId);
        
      if (timeSlotsError) {
        await supabaseAdmin.from('courses').delete().eq('id', course.id);
        throw new Error(`Time slots insert error: ${timeSlotsError.message}`);
      }
    }
    
    return course;
  } catch (error) {
    throw error;
  }
};

const enrollStudentInCourse = async (studentId, courseId) => {
  try {
    const { data: enrollment, error } = await supabaseAdmin
      .from('enrollments')
      .insert({
        student_id: studentId,
        course_id: courseId,
        enrollment_status: 'enrolled'
      })
      .select()
      .single();
      
    if (error) {
      throw new Error(`Enrollment error: ${error.message}`);
    }
    
    const { error: updateError } = await supabaseAdmin
      .from('courses')
      .update({ 
        current_enrollment: supabaseAdmin.sql`current_enrollment + 1` 
      })
      .eq('id', courseId);
      
    if (updateError) {
      console.error('Failed to update course enrollment count:', updateError);
    }
    
    return enrollment;
  } catch (error) {
    throw error;
  }
};

const importStudentSchedule = async (filePath, studentId, semester = 'Fall', year = 2024) => {
  try {
    const { courses, errors } = await importCoursesFromCSV(filePath, semester, year);
    
    if (errors.length > 0) {
      return { success: false, errors, importedCount: 0 };
    }
    
    const importedCourses = [];
    const importErrors = [];
    
    for (let { courseData, timeSlots } of courses) {
      try {
        let course = null;
        
        const { data: existingCourse, error: searchError } = await supabaseAdmin
          .from('courses')
          .select('*')
          .eq('course_code', courseData.course_code)
          .eq('semester', courseData.semester)
          .eq('year', courseData.year)
          .single();
          
        if (existingCourse) {
          course = existingCourse;
        } else {
          course = await saveCourseToDatabase(courseData, timeSlots, studentId);
        }
        
        await enrollStudentInCourse(studentId, course.id);
        importedCourses.push(course);
        
      } catch (error) {
        importErrors.push(`${courseData.course_code}: ${error.message}`);
      }
    }
    
    return {
      success: importErrors.length === 0,
      importedCount: importedCourses.length,
      errors: importErrors,
      courses: importedCourses
    };
    
  } catch (error) {
    return {
      success: false,
      errors: [`Import failed: ${error.message}`],
      importedCount: 0
    };
  }
};

module.exports = {
  importCoursesFromCSV,
  saveCourseToDatabase,
  enrollStudentInCourse,
  importStudentSchedule,
  validateCourseData,
  validateTimeSlotData,
  parseTimeString,
  parseDaysOfWeek
};