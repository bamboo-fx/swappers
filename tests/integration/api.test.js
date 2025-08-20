const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Only run integration tests if INTEGRATION_TEST is set
if (!process.env.INTEGRATION_TEST) {
  describe.skip('Integration Tests', () => {
    test('Skipped - Set INTEGRATION_TEST=true to run integration tests', () => {});
  });
} else {
  
  // Import app after setting up environment
  const app = require('../../server');
  const { sampleUsers, sampleCsvData } = require('../fixtures/testData');

  describe('Course Swapper API Integration Tests', () => {
    let authTokenAlice, authTokenBob;
    let aliceUserId, bobUserId;
    let testCourseIds = {};

    beforeAll(async () => {
      // Register test users
      const aliceResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'alice.test@university.edu',
          password: 'testpassword123',
          fullName: 'Alice Test',
          studentId: 'TEST001',
          university: 'Test University'
        });

      const bobResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'bob.test@university.edu',
          password: 'testpassword123',
          fullName: 'Bob Test',
          studentId: 'TEST002',
          university: 'Test University'
        });

      // Login to get tokens
      const aliceLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'alice.test@university.edu',
          password: 'testpassword123'
        });

      const bobLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob.test@university.edu',
          password: 'testpassword123'
        });

      authTokenAlice = aliceLogin.body.session.access_token;
      authTokenBob = bobLogin.body.session.access_token;
      aliceUserId = aliceLogin.body.user.id;
      bobUserId = bobLogin.body.user.id;
    });

    afterAll(async () => {
      // Cleanup: Delete test data if needed
      // In a real test environment, you might want to clean up test data
    });

    describe('Authentication Endpoints', () => {
      test('GET /health should return OK', async () => {
        const response = await request(app)
          .get('/health');
        
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
      });

      test('POST /api/auth/register should create new user', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'newuser@university.edu',
            password: 'password123',
            fullName: 'New User',
            studentId: 'NEW001'
          });
        
        expect(response.status).toBe(201);
        expect(response.body.message).toContain('Registration successful');
      });

      test('POST /api/auth/login should authenticate user', async () => {
        // First register a user
        await request(app)
          .post('/api/auth/register')
          .send({
            email: 'logintest@university.edu',
            password: 'password123',
            fullName: 'Login Test'
          });

        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'logintest@university.edu',
            password: 'password123'
          });
        
        expect(response.status).toBe(200);
        expect(response.body.session).toBeDefined();
        expect(response.body.user.email).toBe('logintest@university.edu');
      });

      test('GET /api/auth/profile should return user profile', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${authTokenAlice}`);
        
        expect(response.status).toBe(200);
        expect(response.body.profile.email).toBe('alice.test@university.edu');
      });
    });

    describe('Course Management Endpoints', () => {
      test('POST /api/courses/import should import CSV schedule', async () => {
        // Create a temporary CSV file
        const csvPath = path.join(__dirname, '../fixtures/test-schedule.csv');
        fs.writeFileSync(csvPath, sampleCsvData);

        const response = await request(app)
          .post('/api/courses/import')
          .set('Authorization', `Bearer ${authTokenAlice}`)
          .attach('schedule', csvPath)
          .field('semester', 'Fall')
          .field('year', '2024');

        expect(response.status).toBe(200);
        expect(response.body.importedCount).toBeGreaterThan(0);
        expect(response.body.courses).toBeDefined();

        // Store course IDs for later tests
        response.body.courses.forEach(course => {
          testCourseIds[course.course_code] = course.id;
        });

        // Cleanup
        fs.unlinkSync(csvPath);
      });

      test('GET /api/courses should list courses', async () => {
        const response = await request(app)
          .get('/api/courses')
          .set('Authorization', `Bearer ${authTokenAlice}`)
          .query({ semester: 'Fall', year: 2024 });
        
        expect(response.status).toBe(200);
        expect(response.body.courses).toBeDefined();
        expect(Array.isArray(response.body.courses)).toBe(true);
      });

      test('GET /api/courses/enrolled should show enrolled courses', async () => {
        const response = await request(app)
          .get('/api/courses/enrolled')
          .set('Authorization', `Bearer ${authTokenAlice}`);
        
        expect(response.status).toBe(200);
        expect(response.body.enrollments).toBeDefined();
      });

      test('POST /api/courses/enroll/:courseId should enroll in course', async () => {
        // First, we need a course ID to enroll in
        const coursesResponse = await request(app)
          .get('/api/courses')
          .set('Authorization', `Bearer ${authTokenBob}`)
          .query({ semester: 'Fall', year: 2024 });

        if (coursesResponse.body.courses.length > 0) {
          const courseId = coursesResponse.body.courses[0].id;
          
          const response = await request(app)
            .post(`/api/courses/enroll/${courseId}`)
            .set('Authorization', `Bearer ${authTokenBob}`);
          
          expect([200, 201, 400]).toContain(response.status);
          // Status 400 is acceptable if already enrolled
        }
      });
    });

    describe('Swap System Endpoints', () => {
      let swapRequestId, matchId;

      test('POST /api/swaps/requests should create swap request', async () => {
        // First ensure both users have enrollments
        const aliceEnrolled = await request(app)
          .get('/api/courses/enrolled')
          .set('Authorization', `Bearer ${authTokenAlice}`);

        const bobEnrolled = await request(app)
          .get('/api/courses/enrolled')
          .set('Authorization', `Bearer ${authTokenBob}`);

        if (aliceEnrolled.body.enrollments.length > 0 && bobEnrolled.body.enrollments.length > 0) {
          const aliceCourse = aliceEnrolled.body.enrollments[0].courses.id;
          const desiredCourse = bobEnrolled.body.enrollments[0].courses.id;

          const response = await request(app)
            .post('/api/swaps/requests')
            .set('Authorization', `Bearer ${authTokenAlice}`)
            .send({
              fromCourseId: aliceCourse,
              desiredCourseId: desiredCourse,
              priority: 1,
              notes: 'Test swap request'
            });

          expect([200, 201]).toContain(response.status);
          if (response.status === 201) {
            swapRequestId = response.body.swapRequest.id;
          }
        }
      });

      test('GET /api/swaps/requests should list user swap requests', async () => {
        const response = await request(app)
          .get('/api/swaps/requests')
          .set('Authorization', `Bearer ${authTokenAlice}`);
        
        expect(response.status).toBe(200);
        expect(response.body.swapRequests).toBeDefined();
      });

      test('GET /api/swaps/marketplace should show marketplace', async () => {
        const response = await request(app)
          .get('/api/swaps/marketplace')
          .set('Authorization', `Bearer ${authTokenBob}`);
        
        expect(response.status).toBe(200);
        expect(response.body.swapRequests).toBeDefined();
      });

      test('GET /api/swaps/matches should show user matches', async () => {
        const response = await request(app)
          .get('/api/swaps/matches')
          .set('Authorization', `Bearer ${authTokenAlice}`);
        
        expect(response.status).toBe(200);
        expect(response.body.matches).toBeDefined();
      });

      // Note: Testing match confirmation would require creating a proper match
      // which is complex in integration tests. This would be better suited
      // for end-to-end tests with a proper test database setup.
    });

    describe('Error Handling', () => {
      test('should return 401 for unauthorized requests', async () => {
        const response = await request(app)
          .get('/api/courses/enrolled');
        
        expect(response.status).toBe(401);
      });

      test('should return 404 for non-existent routes', async () => {
        const response = await request(app)
          .get('/api/nonexistent');
        
        expect(response.status).toBe(404);
      });

      test('should handle invalid JSON gracefully', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .set('Content-Type', 'application/json')
          .send('invalid json');
        
        expect([400, 500]).toContain(response.status);
      });
    });

    describe('File Upload Tests', () => {
      test('should reject non-CSV files', async () => {
        // Create a temporary text file
        const txtPath = path.join(__dirname, '../fixtures/test.txt');
        fs.writeFileSync(txtPath, 'This is not a CSV file');

        const response = await request(app)
          .post('/api/courses/import')
          .set('Authorization', `Bearer ${authTokenAlice}`)
          .attach('schedule', txtPath);

        expect(response.status).toBe(400);

        // Cleanup
        fs.unlinkSync(txtPath);
      });

      test('should handle missing file upload', async () => {
        const response = await request(app)
          .post('/api/courses/import')
          .set('Authorization', `Bearer ${authTokenAlice}`)
          .send({ semester: 'Fall', year: 2024 });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('CSV file is required');
      });
    });
  });
}

module.exports = {};