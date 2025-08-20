// Mock Supabase first, before importing the modules that use it
// Create a shared mock chain that can be reused and configured per test
const mockChain = {
  select: jest.fn(),
  eq: jest.fn(),
  neq: jest.fn(),
  single: jest.fn(),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn()
};

// Make all methods return the same chain for chaining
mockChain.select.mockReturnValue(mockChain);
mockChain.eq.mockReturnValue(mockChain);
mockChain.neq.mockReturnValue(mockChain);
mockChain.insert.mockReturnValue(mockChain);
mockChain.update.mockReturnValue(mockChain);
mockChain.delete.mockReturnValue(mockChain);

const mockSupabaseAdmin = {
  from: jest.fn(() => mockChain)
};

jest.mock('../../config/supabase', () => ({
  supabaseAdmin: mockSupabaseAdmin
}));

// Now import the modules that depend on the mocked Supabase
const {
  checkTimeConflicts,
  canSwapWithoutConflicts,
  findMutualSwapMatches,
  confirmSwapMatch,
  getMatchContactInfo,
  markSwapCompleted
} = require('../../services/matchingAlgorithm');

const {
  sampleUsers,
  sampleCourses,
  sampleTimeSlots,
  mutualSwapScenario,
  conflictScenario
} = require('../fixtures/testData');

describe('Matching Algorithm Unit Tests', () => {
  
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
  });

  describe('confirmSwapMatch - Contact Exchange Model', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should record first student confirmation and wait for other', async () => {
      const mockMatch = {
        id: 'match-123',
        student_a_id: sampleUsers.alice.id,
        student_b_id: sampleUsers.bob.id,
        student_a_confirmed: false,
        student_b_confirmed: false,
        student_a: sampleUsers.alice,
        student_b: sampleUsers.bob
      };

      // Configure the global mock chain for this test
      mockChain.single.mockResolvedValueOnce({
        data: mockMatch,
        error: null
      });

      mockChain.eq.mockResolvedValueOnce({
        error: null
      });

      const result = await confirmSwapMatch('match-123', sampleUsers.alice.id);

      expect(result).toEqual({
        success: true,
        message: 'Your confirmation recorded. Waiting for the other student to confirm.',
        status: 'waiting_for_other_confirmation'
      });
    });

    test('should provide contact info when both students confirm', async () => {
      const mockMatch = {
        id: 'match-123',
        student_a_id: sampleUsers.alice.id,
        student_b_id: sampleUsers.bob.id,
        student_a_confirmed: false,
        student_b_confirmed: true, // Bob already confirmed
        student_a: sampleUsers.alice,
        student_b: sampleUsers.bob
      };

      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMatch,
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      });

      const result = await confirmSwapMatch('match-123', sampleUsers.alice.id);

      expect(result).toMatchObject({
        success: true,
        message: 'Both students confirmed! Contact information is now available.',
        contactInfo: {
          name: sampleUsers.bob.full_name,
          email: sampleUsers.bob.email,
          studentId: sampleUsers.bob.student_id
        },
        status: 'confirmed'
      });
    });

    test('should reject confirmation from non-participant', async () => {
      const mockMatch = {
        id: 'match-123',
        student_a_id: sampleUsers.alice.id,
        student_b_id: sampleUsers.bob.id
      };

      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMatch,
              error: null
            })
          })
        })
      });

      await expect(confirmSwapMatch('match-123', sampleUsers.charlie.id))
        .rejects.toThrow('Student not part of this match');
    });
  });

  describe('getMatchContactInfo', () => {
    test('should return contact info for confirmed match', async () => {
      const mockMatch = {
        id: 'match-123',
        student_a_id: sampleUsers.alice.id,
        student_b_id: sampleUsers.bob.id,
        match_status: 'confirmed',
        confirmed_at: '2024-01-15T10:30:00Z',
        student_a: sampleUsers.alice,
        student_b: sampleUsers.bob,
        course_a: sampleCourses.cs101,
        course_b: sampleCourses.math201
      };

      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMatch,
              error: null
            })
          })
        })
      });

      const result = await getMatchContactInfo('match-123', sampleUsers.alice.id);

      expect(result).toMatchObject({
        matchId: 'match-123',
        contactInfo: {
          name: sampleUsers.bob.full_name,
          email: sampleUsers.bob.email,
          studentId: sampleUsers.bob.student_id
        },
        swapDetails: {
          yourCourse: {
            code: sampleCourses.cs101.course_code,
            title: sampleCourses.cs101.course_title
          },
          theirCourse: {
            code: sampleCourses.math201.course_code,
            title: sampleCourses.math201.course_title
          }
        },
        instructions: 'Contact this student to arrange the course swap through your school\'s enrollment system.'
      });
    });

    test('should reject access to unconfirmed match', async () => {
      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      });

      await expect(getMatchContactInfo('match-123', sampleUsers.alice.id))
        .rejects.toThrow('Match not found or not confirmed yet');
    });
  });

  describe('markSwapCompleted', () => {
    test('should mark completion for first student', async () => {
      const mockMatch = {
        id: 'match-123',
        student_a_id: sampleUsers.alice.id,
        student_b_id: sampleUsers.bob.id,
        match_status: 'confirmed',
        student_a_completed: false,
        student_b_completed: false
      };

      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMatch,
              error: null
            })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null
          })
        })
      });

      const result = await markSwapCompleted('match-123', sampleUsers.alice.id);

      expect(result).toEqual({
        success: true,
        message: 'Your completion recorded. Waiting for other student to confirm completion.'
      });
    });

    test('should mark entire swap as completed when both confirm', async () => {
      const mockMatch = {
        id: 'match-123',
        student_a_id: sampleUsers.alice.id,
        student_b_id: sampleUsers.bob.id,
        match_status: 'confirmed',
        student_a_completed: false,
        student_b_completed: true, // Bob already marked completed
        request_a_id: 'req-a',
        request_b_id: 'req-b'
      };

      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      });

      mockSupabaseAdmin.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockMatch,
              error: null
            })
          })
        }),
        update: updateMock
      });

      const result = await markSwapCompleted('match-123', sampleUsers.alice.id);

      expect(result).toEqual({
        success: true,
        message: 'Swap marked as completed by both students!'
      });
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete swap workflow', async () => {
      // This would be a more complex test that walks through:
      // 1. Creating swap requests
      // 2. Finding mutual matches
      // 3. Both students confirming
      // 4. Getting contact info
      // 5. Marking as completed
      
      // For now, this is a placeholder for a more comprehensive integration test
      expect(true).toBe(true);
    });
  });
});

describe('Course Import Utility Tests', () => {
  const {
    parseTimeString,
    parseDaysOfWeek,
    validateCourseData,
    validateTimeSlotData
  } = require('../../utils/courseImport');

  describe('parseTimeString', () => {
    test('should parse 12-hour AM time correctly', () => {
      expect(parseTimeString('9:00 AM')).toBe('09:00:00');
      expect(parseTimeString('12:00 AM')).toBe('00:00:00');
    });

    test('should parse 12-hour PM time correctly', () => {
      expect(parseTimeString('1:30 PM')).toBe('13:30:00');
      expect(parseTimeString('12:00 PM')).toBe('12:00:00');
    });

    test('should handle invalid time strings', () => {
      expect(parseTimeString('25:00 AM')).toBeNull();
      expect(parseTimeString('invalid time')).toBeNull();
      expect(parseTimeString('')).toBeNull();
    });
  });

  describe('parseDaysOfWeek', () => {
    test('should parse standard day abbreviations', () => {
      expect(parseDaysOfWeek('MWF')).toEqual([1, 3, 5]);
      expect(parseDaysOfWeek('TR')).toEqual([2, 4]);
      expect(parseDaysOfWeek('MTWRF')).toEqual([1, 2, 3, 4, 5]);
    });

    test('should handle Sunday (U) and Saturday (S)', () => {
      expect(parseDaysOfWeek('US')).toEqual([0, 6]);
    });

    test('should handle invalid day strings', () => {
      expect(parseDaysOfWeek('XYZ')).toEqual([]);
      expect(parseDaysOfWeek('')).toEqual([]);
    });
  });

  describe('validateCourseData', () => {
    test('should validate correct course data', () => {
      const validCourse = {
        course_code: 'CS101',
        course_title: 'Introduction to Programming',
        credits: 3,
        year: 2024
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
  });
});