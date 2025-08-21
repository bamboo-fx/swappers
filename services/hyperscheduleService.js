const axios = require('axios');
const { supabaseAdmin } = require('../config/supabase');

class HyperscheduleService {
  constructor() {
    this.baseURL = 'https://hyperschedule.herokuapp.com';
    this.apiVersion = 'v3';
    this.supportedSchools = ['hmc', 'pomona', 'cmc', 'scripps', 'pitzer'];
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
  }

  async fetchCoursesFromHyperschedule(school = 'hmc', since = null) {
    try {
      const cacheKey = `${school}-${since || 'full'}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`Returning cached data for ${school}`);
        return cached.data;
      }

      const url = `${this.baseURL}/api/${this.apiVersion}/courses`;
      const params = { school };
      if (since) params.since = since;

      console.log(`Fetching courses from Hyperschedule: ${url}`, params);
      const response = await axios.get(url, { 
        params,
        timeout: 30000 // 30 second timeout
      });

      if (response.data.error) {
        throw new Error(`Hyperschedule API error: ${response.data.error}`);
      }

      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching from Hyperschedule:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  transformHyperScheduleCourse(hyperCourse) {
    try {
      return {
        hyperschedule_id: hyperCourse.courseCode || hyperCourse.identifier,
        course_code: hyperCourse.courseCode || hyperCourse.code,
        course_title: hyperCourse.courseName || hyperCourse.title || hyperCourse.name,
        department: hyperCourse.department,
        credits: hyperCourse.quarterCredits || hyperCourse.credits || 1,
        description: hyperCourse.courseDescription || hyperCourse.description,
        instructor: Array.isArray(hyperCourse.faculty) 
          ? hyperCourse.faculty.join(', ') 
          : hyperCourse.faculty || hyperCourse.instructor,
        max_capacity: hyperCourse.seatsFilled !== undefined && hyperCourse.seatsTotal !== undefined
          ? hyperCourse.seatsTotal
          : null,
        current_enrollment: hyperCourse.seatsFilled || 0,
        semester: hyperCourse.semester || 'Fall',
        year: hyperCourse.year || new Date().getFullYear(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error transforming course:', error, hyperCourse);
      throw error;
    }
  }

  transformTimeSlots(hyperCourse) {
    const timeSlots = [];
    
    try {
      if (!hyperCourse.schedule || !Array.isArray(hyperCourse.schedule)) {
        return timeSlots;
      }

      for (const scheduleItem of hyperCourse.schedule) {
        if (!scheduleItem.scheduleDays || !scheduleItem.scheduleStartTime || !scheduleItem.scheduleEndTime) {
          continue;
        }

        const days = this.parseDays(scheduleItem.scheduleDays);
        const startTime = this.parseTime(scheduleItem.scheduleStartTime);
        const endTime = this.parseTime(scheduleItem.scheduleEndTime);

        if (!startTime || !endTime) {
          continue;
        }

        for (const day of days) {
          timeSlots.push({
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
            location: scheduleItem.scheduleLocation || null
          });
        }
      }
    } catch (error) {
      console.error('Error transforming time slots:', error, hyperCourse);
    }

    return timeSlots;
  }

  parseDays(dayString) {
    if (!dayString) return [];
    
    const dayMap = {
      'M': 1, 'T': 2, 'W': 3, 'R': 4, 'F': 5, 'S': 6, 'U': 0
    };
    
    const days = [];
    for (const char of dayString.toUpperCase()) {
      if (dayMap[char] !== undefined) {
        days.push(dayMap[char]);
      }
    }
    
    return days;
  }

  parseTime(timeString) {
    if (!timeString) return null;
    
    // Handle different time formats
    const patterns = [
      /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i,
      /^(\d{1,2})(\d{2})$/,
      /^(\d{1,2}):(\d{2}):(\d{2})$/
    ];

    for (const pattern of patterns) {
      const match = timeString.match(pattern);
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3];

        if (period) {
          if (period.toUpperCase() === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
          }
        }

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
      }
    }

    return null;
  }

  async syncCourseToDatabase(courseData, timeSlots) {
    try {
      // Check if course already exists
      const { data: existingCourse, error: searchError } = await supabaseAdmin
        .from('courses')
        .select('id, updated_at')
        .eq('hyperschedule_id', courseData.hyperschedule_id)
        .eq('semester', courseData.semester)
        .eq('year', courseData.year)
        .single();

      let course;
      
      if (existingCourse) {
        // Update existing course
        const { data: updatedCourse, error: updateError } = await supabaseAdmin
          .from('courses')
          .update(courseData)
          .eq('id', existingCourse.id)
          .select()
          .single();

        if (updateError) throw updateError;
        course = updatedCourse;

        // Delete existing time slots
        await supabaseAdmin
          .from('time_slots')
          .delete()
          .eq('course_id', course.id);
      } else {
        // Insert new course
        const { data: newCourse, error: insertError } = await supabaseAdmin
          .from('courses')
          .insert(courseData)
          .select()
          .single();

        if (insertError) throw insertError;
        course = newCourse;
      }

      // Insert time slots
      if (timeSlots.length > 0) {
        const timeSlotsWithCourseId = timeSlots.map(slot => ({
          ...slot,
          course_id: course.id
        }));

        const { error: timeSlotsError } = await supabaseAdmin
          .from('time_slots')
          .insert(timeSlotsWithCourseId);

        if (timeSlotsError) {
          console.error('Error inserting time slots:', timeSlotsError);
        }
      }

      return course;
    } catch (error) {
      console.error('Error syncing course to database:', error);
      throw error;
    }
  }

  async syncAllCourses(school = 'hmc') {
    try {
      console.log(`Starting sync for school: ${school}`);
      const hyperscheduleData = await this.fetchCoursesFromHyperschedule(school);
      
      if (!hyperscheduleData.data || !Array.isArray(hyperscheduleData.data.courses)) {
        throw new Error('Invalid data structure from Hyperschedule API');
      }

      const courses = hyperscheduleData.data.courses;
      let syncedCount = 0;
      let errorCount = 0;

      for (const hyperCourse of courses) {
        try {
          const courseData = this.transformHyperScheduleCourse(hyperCourse);
          const timeSlots = this.transformTimeSlots(hyperCourse);
          
          await this.syncCourseToDatabase(courseData, timeSlots);
          syncedCount++;
          
          if (syncedCount % 50 === 0) {
            console.log(`Synced ${syncedCount} courses...`);
          }
        } catch (error) {
          console.error(`Error syncing course ${hyperCourse.courseCode}:`, error.message);
          errorCount++;
        }
      }

      console.log(`Sync completed. Synced: ${syncedCount}, Errors: ${errorCount}`);
      return { syncedCount, errorCount, total: courses.length };
    } catch (error) {
      console.error('Error in syncAllCourses:', error);
      throw error;
    }
  }

  async searchCourses(query, filters = {}) {
    try {
      const { 
        department, 
        semester = 'Fall', 
        year = new Date().getFullYear(),
        limit = 50,
        offset = 0
      } = filters;

      let dbQuery = supabaseAdmin
        .from('courses')
        .select(`
          id,
          hyperschedule_id,
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
        .eq('year', parseInt(year))
        .range(offset, offset + limit - 1);

      if (query) {
        dbQuery = dbQuery.or(`course_code.ilike.%${query}%,course_title.ilike.%${query}%,instructor.ilike.%${query}%`);
      }

      if (department) {
        dbQuery = dbQuery.eq('department', department);
      }

      const { data: courses, error } = await dbQuery;

      if (error) throw error;

      return courses || [];
    } catch (error) {
      console.error('Error searching courses:', error);
      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = new HyperscheduleService();