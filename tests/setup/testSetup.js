require('dotenv').config();

// Mock Supabase for unit tests
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        eq: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn()
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      })),
      delete: jest.fn(() => ({
        eq: jest.fn()
      }))
    }))
  })),
  auth: {
    getUser: jest.fn(),
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn()
  }
};

// Only mock if not running integration tests
if (!process.env.INTEGRATION_TEST) {
  jest.mock('../../config/supabase', () => ({
    supabase: mockSupabase,
    supabaseAdmin: mockSupabase
  }));
}

global.console = {
  ...console,
  // Mock console.error to reduce noise in tests
  error: jest.fn(),
  warn: jest.fn(),
};