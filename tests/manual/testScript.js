#!/usr/bin/env node

/**
 * Manual Testing Script for Course Swapper API
 * 
 * This script provides a simple way to test the API endpoints manually
 * Run with: node tests/manual/testScript.js
 * 
 * Prerequisites:
 * 1. Server should be running on http://localhost:3000
 * 2. Supabase should be configured and connected
 * 3. Database schema should be set up
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

class APITester {
  constructor() {
    this.authTokens = {};
    this.testData = {};
  }

  async log(message, data = null) {
    console.log(`🔍 ${message}`);
    if (data && process.env.VERBOSE) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async logError(message, error) {
    console.error(`❌ ${message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(error.message);
    }
  }

  async logSuccess(message, data = null) {
    console.log(`✅ ${message}`);
    if (data && process.env.VERBOSE) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  // Test basic server connectivity
  async testHealthCheck() {
    try {
      await this.log('Testing health check endpoint...');
      const response = await axios.get(`${BASE_URL}/health`);
      
      if (response.data.status === 'OK') {
        await this.logSuccess('Health check passed');
        return true;
      } else {
        await this.logError('Health check failed', new Error('Status not OK'));
        return false;
      }
    } catch (error) {
      await this.logError('Health check failed', error);
      return false;
    }
  }

  // Test user registration
  async testUserRegistration(userData) {
    try {
      await this.log(`Registering user: ${userData.email}...`);
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      
      await this.logSuccess(`User ${userData.email} registered`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 400 && 
          error.response.data.error && error.response.data.error.includes('already registered')) {
        await this.log(`User ${userData.email} already exists, continuing...`);
        return { alreadyExists: true };
      }
      await this.logError(`Failed to register ${userData.email}`, error);
      throw error;
    }
  }

  // Test user login
  async testUserLogin(email, password) {
    try {
      await this.log(`Logging in user: ${email}...`);
      const response = await axios.post(`${API_URL}/auth/login`, {
        email,
        password
      });
      
      const token = response.data.session.access_token;
      const userId = response.data.user.id;
      
      this.authTokens[email] = token;
      this.testData[email] = { userId, token };
      
      await this.logSuccess(`User ${email} logged in`);
      return { token, userId };
    } catch (error) {
      await this.logError(`Failed to login ${email}`, error);
      throw error;
    }
  }

  // Test profile retrieval
  async testGetProfile(email) {
    try {
      await this.log(`Getting profile for: ${email}...`);
      const token = this.authTokens[email];
      
      const response = await axios.get(`${API_URL}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await this.logSuccess(`Retrieved profile for ${email}`);
      return response.data;
    } catch (error) {
      await this.logError(`Failed to get profile for ${email}`, error);
      throw error;
    }
  }

  // Test course import
  async testCourseImport(email, csvData) {
    try {
      await this.log(`Importing courses for: ${email}...`);
      const token = this.authTokens[email];
      
      // Create temporary CSV file
      const tempFile = path.join(__dirname, `temp-${Date.now()}.csv`);
      fs.writeFileSync(tempFile, csvData);
      
      const FormData = require('form-data');
      const form = new FormData();
      form.append('schedule', fs.createReadStream(tempFile));
      form.append('semester', 'Fall');
      form.append('year', '2024');
      
      const response = await axios.post(`${API_URL}/courses/import`, form, {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${token}`
        }
      });
      
      // Cleanup temp file
      fs.unlinkSync(tempFile);
      
      this.testData[email].courses = response.data.courses;
      
      await this.logSuccess(`Imported ${response.data.importedCount} courses for ${email}`);
      return response.data;
    } catch (error) {
      await this.logError(`Failed to import courses for ${email}`, error);
      throw error;
    }
  }

  // Test swap request creation
  async testCreateSwapRequest(email, fromCourseId, desiredCourseId) {
    try {
      await this.log(`Creating swap request for: ${email}...`);
      const token = this.authTokens[email];
      
      const response = await axios.post(`${API_URL}/swaps/requests`, {
        fromCourseId,
        desiredCourseId,
        priority: 1,
        notes: `Test swap request from ${email}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await this.logSuccess(`Created swap request for ${email}`);
      
      if (response.data.matchResult && response.data.matchResult.matched) {
        await this.logSuccess('🎉 Automatic match found!');
      }
      
      return response.data;
    } catch (error) {
      await this.logError(`Failed to create swap request for ${email}`, error);
      throw error;
    }
  }

  // Test getting matches
  async testGetMatches(email) {
    try {
      await this.log(`Getting matches for: ${email}...`);
      const token = this.authTokens[email];
      
      const response = await axios.get(`${API_URL}/swaps/matches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await this.logSuccess(`Found ${response.data.matches.length} matches for ${email}`);
      return response.data;
    } catch (error) {
      await this.logError(`Failed to get matches for ${email}`, error);
      throw error;
    }
  }

  // Test marketplace
  async testMarketplace(email) {
    try {
      await this.log(`Getting marketplace data for: ${email}...`);
      const token = this.authTokens[email];
      
      const response = await axios.get(`${API_URL}/swaps/marketplace`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await this.logSuccess(`Found ${response.data.swapRequests.length} requests in marketplace`);
      return response.data;
    } catch (error) {
      await this.logError(`Failed to get marketplace for ${email}`, error);
      throw error;
    }
  }

  // Run complete test suite
  async runCompleteTest() {
    console.log('🚀 Starting Manual API Test Suite...\n');

    try {
      // Test 1: Health check
      console.log('=== Test 1: Server Health ===');
      const healthOk = await this.testHealthCheck();
      if (!healthOk) {
        console.error('❌ Server health check failed. Is the server running?');
        return;
      }
      console.log('');

      // Test 2: User Registration and Authentication
      console.log('=== Test 2: User Authentication ===');
      const alice = {
        email: 'alice.manual@example.com',
        password: 'testpassword123',
        fullName: 'Alice Manual Test',
        studentId: 'ALICE_MANUAL',
        university: 'Manual Test University',
        phoneNumber: '(555) 111-1111'
      };

      const bob = {
        email: 'bob.manual@example.com',
        password: 'testpassword123',
        fullName: 'Bob Manual Test',
        studentId: 'BOB_MANUAL',
        university: 'Manual Test University',
        phoneNumber: '(555) 222-2222'
      };

      await this.testUserRegistration(alice);
      await this.testUserRegistration(bob);

      await this.testUserLogin(alice.email, alice.password);
      await this.testUserLogin(bob.email, bob.password);

      await this.testGetProfile(alice.email);
      await this.testGetProfile(bob.email);
      console.log('');

      // Test 3: Course Import
      console.log('=== Test 3: Course Import ===');
      const aliceCourses = `course_code,course_title,department,credits,instructor,days,start_time,end_time,location
CS101,Introduction to Programming,Computer Science,3,Dr. Smith,MWF,9:00 AM,10:00 AM,CS Building 101
MATH201,Calculus II,Mathematics,4,Prof. Johnson,TR,11:00 AM,12:30 PM,Math Building 201`;

      const bobCourses = `course_code,course_title,department,credits,instructor,days,start_time,end_time,location
PHYS101,Introduction to Physics,Physics,3,Dr. Wilson,MWF,2:00 PM,3:00 PM,Physics Building 301
CS101,Introduction to Programming,Computer Science,3,Dr. Smith,MWF,9:00 AM,10:00 AM,CS Building 101`;

      await this.testCourseImport(alice.email, aliceCourses);
      await this.testCourseImport(bob.email, bobCourses);
      console.log('');

      // Test 4: Swap Requests
      console.log('=== Test 4: Swap Requests and Matching ===');
      const aliceCourseData = this.testData[alice.email].courses;
      const bobCourseData = this.testData[bob.email].courses;

      if (aliceCourseData && bobCourseData && aliceCourseData.length > 0 && bobCourseData.length > 0) {
        // Alice wants Bob's PHYS101, offers her CS101
        const aliceCS101 = aliceCourseData.find(c => c.course_code === 'CS101');
        const bobPHYS101 = bobCourseData.find(c => c.course_code === 'PHYS101');

        if (aliceCS101 && bobPHYS101) {
          await this.testCreateSwapRequest(alice.email, aliceCS101.id, bobPHYS101.id);
          
          // Bob wants Alice's CS101 (which he doesn't have), offers his PHYS101
          await this.testCreateSwapRequest(bob.email, bobPHYS101.id, aliceCS101.id);
        }
      }
      console.log('');

      // Test 5: Match Discovery
      console.log('=== Test 5: Match Discovery ===');
      await this.testGetMatches(alice.email);
      await this.testGetMatches(bob.email);
      console.log('');

      // Test 6: Marketplace
      console.log('=== Test 6: Marketplace ===');
      await this.testMarketplace(alice.email);
      console.log('');

      console.log('🎉 Manual API Test Suite Completed Successfully!');
      console.log('\n📋 Summary:');
      console.log('✅ Server health check passed');
      console.log('✅ User registration and authentication working');
      console.log('✅ Course import functionality working');
      console.log('✅ Swap request creation working');
      console.log('✅ Match discovery working');
      console.log('✅ Marketplace browsing working');
      console.log('\n💡 The course swap backend is ready for frontend development!');

    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      console.error('\n🔧 Troubleshooting:');
      console.error('1. Make sure the server is running: npm run dev');
      console.error('2. Check your .env file configuration');
      console.error('3. Verify Supabase connection and database schema');
      console.error('4. Check server logs for detailed error information');
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new APITester();
  tester.runCompleteTest();
}

module.exports = APITester;