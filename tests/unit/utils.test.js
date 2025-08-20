const {
  parseTimeString,
  parseDaysOfWeek,
  validateCourseData,
  validateTimeSlotData
} = require('../../utils/courseImport');

describe('Course Import Utilities', () => {
  
  describe('parseTimeString', () => {
    test('should parse 12-hour AM time correctly', () => {
      expect(parseTimeString('9:00 AM')).toBe('09:00:00');
      expect(parseTimeString('12:00 AM')).toBe('00:00:00');
      expect(parseTimeString('1:30 AM')).toBe('01:30:00');
    });

    test('should parse 12-hour PM time correctly', () => {
      expect(parseTimeString('1:30 PM')).toBe('13:30:00');
      expect(parseTimeString('12:00 PM')).toBe('12:00:00');
      expect(parseTimeString('11:45 PM')).toBe('23:45:00');
    });

    test('should handle invalid time strings', () => {
      expect(parseTimeString('25:00 AM')).toBeNull(); // Invalid hour
      expect(parseTimeString('12:75 PM')).toBeNull(); // Invalid minutes
      expect(parseTimeString('0:30 AM')).toBeNull();  // Invalid hour (0)
      expect(parseTimeString('13:30 AM')).toBeNull(); // Invalid hour (>12)
      expect(parseTimeString('invalid time')).toBeNull();
      expect(parseTimeString('')).toBeNull();
      expect(parseTimeString(null)).toBeNull();
    });

    test('should handle times without AM/PM', () => {
      expect(parseTimeString('9:00')).toBe('09:00:00');
      expect(parseTimeString('12:30')).toBe('12:30:00');
    });
  });

  describe('parseDaysOfWeek', () => {
    test('should parse standard day abbreviations', () => {
      expect(parseDaysOfWeek('MWF')).toEqual([1, 3, 5]); // Monday, Wednesday, Friday
      expect(parseDaysOfWeek('TR')).toEqual([2, 4]);     // Tuesday, Thursday
      expect(parseDaysOfWeek('MTWRF')).toEqual([1, 2, 3, 4, 5]); // Weekdays
    });

    test('should handle Sunday (U) and Saturday (S)', () => {
      expect(parseDaysOfWeek('US')).toEqual([0, 6]);     // Sunday, Saturday
      expect(parseDaysOfWeek('SU')).toEqual([6, 0]);     // Saturday, Sunday
    });

    test('should handle invalid day strings', () => {
      expect(parseDaysOfWeek('XYZ')).toEqual([]);
      expect(parseDaysOfWeek('')).toEqual([]);
      expect(parseDaysOfWeek(null)).toEqual([]);
    });

    test('should handle mixed valid and invalid days', () => {
      expect(parseDaysOfWeek('MXW')).toEqual([1, 3]); // M and W valid, X invalid
    });
  });

  describe('validateCourseData', () => {
    test('should validate correct course data', () => {
      const validCourse = {
        course_code: 'CS101',
        course_title: 'Introduction to Programming',
        credits: 3,
        year: 2024,
        max_capacity: 30
      };
      
      expect(validateCourseData(validCourse)).toEqual([]);
    });

    test('should catch missing required fields', () => {
      const invalidCourse = {
        // Missing both course_code and course_title
      };
      
      const errors = validateCourseData(invalidCourse);
      expect(errors).toContain('Course code is required');
      expect(errors).toContain('Course title is required');
    });

    test('should validate credit range', () => {
      const invalidCourse = {
        course_code: 'CS999',
        course_title: 'Invalid Credits Course',
        credits: 25 // Too many credits
      };
      
      const errors = validateCourseData(invalidCourse);
      expect(errors).toContain('Credits must be a number between 0 and 20');
    });

    test('should validate year range', () => {
      const invalidCourse = {
        course_code: 'CS999',
        course_title: 'Invalid Year Course',
        year: 2050 // Too far in future
      };
      
      const errors = validateCourseData(invalidCourse);
      expect(errors).toContain('Year must be between 2020 and 2030');
    });

    test('should allow empty optional fields', () => {
      const validCourse = {
        course_code: 'CS101',
        course_title: 'Basic Course'
        // credits, year, max_capacity are optional
      };
      
      expect(validateCourseData(validCourse)).toEqual([]);
    });
  });

  describe('validateTimeSlotData', () => {
    test('should validate correct time slot data', () => {
      const validTimeSlot = {
        day_of_week: 1,
        start_time: '09:00:00',
        end_time: '10:00:00',
        location: 'Room 101'
      };
      
      expect(validateTimeSlotData(validTimeSlot)).toEqual([]);
    });

    test('should catch missing required fields', () => {
      const invalidTimeSlot = {
        day_of_week: 1
        // Missing start_time and end_time
      };
      
      const errors = validateTimeSlotData(invalidTimeSlot);
      expect(errors).toContain('Start time is required');
      expect(errors).toContain('End time is required');
    });

    test('should validate time order', () => {
      const invalidTimeSlot = {
        day_of_week: 1,
        start_time: '10:00:00',
        end_time: '09:00:00' // End before start
      };
      
      const errors = validateTimeSlotData(invalidTimeSlot);
      expect(errors).toContain('End time must be after start time');
    });

    test('should validate day of week', () => {
      const invalidTimeSlot = {
        day_of_week: 8, // Invalid day
        start_time: '09:00:00',
        end_time: '10:00:00'
      };
      
      const errors = validateTimeSlotData(invalidTimeSlot);
      expect(errors).toContain('Invalid day of week');
    });
  });
});

// Simple logic tests that don't require database mocking
const { checkTimeConflicts } = require('../../services/matchingAlgorithm');

describe('Time Conflict Logic', () => {
  
  describe('checkTimeConflicts', () => {
    test('should detect time conflicts on same day', () => {
      const existingSlots = [
        { day_of_week: 1, start_time: '09:00:00', end_time: '10:00:00' }
      ];
      const newSlots = [
        { day_of_week: 1, start_time: '09:30:00', end_time: '10:30:00' }
      ];
      
      expect(checkTimeConflicts(existingSlots, newSlots)).toBe(true);
    });

    test('should not detect conflicts on different days', () => {
      const existingSlots = [
        { day_of_week: 1, start_time: '09:00:00', end_time: '10:00:00' }
      ];
      const newSlots = [
        { day_of_week: 2, start_time: '09:00:00', end_time: '10:00:00' }
      ];
      
      expect(checkTimeConflicts(existingSlots, newSlots)).toBe(false);
    });

    test('should not detect conflicts for adjacent time slots', () => {
      const existingSlots = [
        { day_of_week: 1, start_time: '09:00:00', end_time: '10:00:00' }
      ];
      const newSlots = [
        { day_of_week: 1, start_time: '10:00:00', end_time: '11:00:00' }
      ];
      
      expect(checkTimeConflicts(existingSlots, newSlots)).toBe(false);
    });

    test('should detect overlapping time slots', () => {
      const existingSlots = [
        { day_of_week: 1, start_time: '09:00:00', end_time: '11:00:00' }
      ];
      const newSlots = [
        { day_of_week: 1, start_time: '10:00:00', end_time: '12:00:00' }
      ];
      
      expect(checkTimeConflicts(existingSlots, newSlots)).toBe(true);
    });

    test('should handle multiple time slots correctly', () => {
      const existingSlots = [
        { day_of_week: 1, start_time: '09:00:00', end_time: '10:00:00' },
        { day_of_week: 3, start_time: '14:00:00', end_time: '15:30:00' }
      ];
      const newSlots = [
        { day_of_week: 2, start_time: '11:00:00', end_time: '12:30:00' },
        { day_of_week: 4, start_time: '11:00:00', end_time: '12:30:00' }
      ];
      
      expect(checkTimeConflicts(existingSlots, newSlots)).toBe(false);
    });

    test('should handle empty arrays', () => {
      expect(checkTimeConflicts([], [])).toBe(false);
      expect(checkTimeConflicts([{ day_of_week: 1, start_time: '09:00:00', end_time: '10:00:00' }], [])).toBe(false);
      expect(checkTimeConflicts([], [{ day_of_week: 1, start_time: '09:00:00', end_time: '10:00:00' }])).toBe(false);
    });
  });
});