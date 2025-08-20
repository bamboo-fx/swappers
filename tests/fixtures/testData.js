// Test data for various test scenarios

const sampleUsers = {
  alice: {
    id: 'alice-user-id-123',
    email: 'alice@university.edu',
    full_name: 'Alice Johnson',
    student_id: 'STU001',
    university: 'Test University',
    major: 'Computer Science',
    year: 3
  },
  bob: {
    id: 'bob-user-id-456',
    email: 'bob@university.edu',
    full_name: 'Bob Smith',
    student_id: 'STU002',
    university: 'Test University',
    major: 'Mathematics',
    year: 2
  },
  charlie: {
    id: 'charlie-user-id-789',
    email: 'charlie@university.edu',
    full_name: 'Charlie Brown',
    student_id: 'STU003',
    university: 'Test University',
    major: 'Physics',
    year: 4
  }
};

const sampleCourses = {
  cs101: {
    id: 'cs101-course-id',
    course_code: 'CS101',
    course_title: 'Introduction to Programming',
    department: 'Computer Science',
    credits: 3,
    instructor: 'Dr. Smith',
    semester: 'Fall',
    year: 2024,
    max_capacity: 30,
    current_enrollment: 25
  },
  math201: {
    id: 'math201-course-id',
    course_code: 'MATH201',
    course_title: 'Calculus II',
    department: 'Mathematics',
    credits: 4,
    instructor: 'Prof. Johnson',
    semester: 'Fall',
    year: 2024,
    max_capacity: 40,
    current_enrollment: 35
  },
  phys301: {
    id: 'phys301-course-id',
    course_code: 'PHYS301',
    course_title: 'Quantum Mechanics',
    department: 'Physics',
    credits: 3,
    instructor: 'Dr. Wilson',
    semester: 'Fall',
    year: 2024,
    max_capacity: 20,
    current_enrollment: 18
  },
  cs201: {
    id: 'cs201-course-id',
    course_code: 'CS201',
    course_title: 'Data Structures',
    department: 'Computer Science',
    credits: 3,
    instructor: 'Dr. Brown',
    semester: 'Fall',
    year: 2024,
    max_capacity: 25,
    current_enrollment: 20
  }
};

const sampleTimeSlots = {
  cs101_mwf: [
    { course_id: 'cs101-course-id', day_of_week: 1, start_time: '09:00:00', end_time: '10:00:00', location: 'CS Building 101' },
    { course_id: 'cs101-course-id', day_of_week: 3, start_time: '09:00:00', end_time: '10:00:00', location: 'CS Building 101' },
    { course_id: 'cs101-course-id', day_of_week: 5, start_time: '09:00:00', end_time: '10:00:00', location: 'CS Building 101' }
  ],
  math201_tr: [
    { course_id: 'math201-course-id', day_of_week: 2, start_time: '11:00:00', end_time: '12:30:00', location: 'Math Building 201' },
    { course_id: 'math201-course-id', day_of_week: 4, start_time: '11:00:00', end_time: '12:30:00', location: 'Math Building 201' }
  ],
  phys301_mw: [
    { course_id: 'phys301-course-id', day_of_week: 1, start_time: '14:00:00', end_time: '15:30:00', location: 'Physics Lab A' },
    { course_id: 'phys301-course-id', day_of_week: 3, start_time: '14:00:00', end_time: '15:30:00', location: 'Physics Lab A' }
  ],
  cs201_tr: [
    { course_id: 'cs201-course-id', day_of_week: 2, start_time: '09:30:00', end_time: '11:00:00', location: 'CS Building 201' },
    { course_id: 'cs201-course-id', day_of_week: 4, start_time: '09:30:00', end_time: '11:00:00', location: 'CS Building 201' }
  ]
};

// Scenario: Alice has CS101, wants MATH201. Bob has MATH201, wants CS101. Perfect match!
const mutualSwapScenario = {
  aliceRequest: {
    id: 'swap-request-alice-1',
    requester_id: sampleUsers.alice.id,
    from_course_id: sampleCourses.cs101.id,
    desired_course_id: sampleCourses.math201.id,
    status: 'active',
    priority: 1
  },
  bobRequest: {
    id: 'swap-request-bob-1',
    requester_id: sampleUsers.bob.id,
    from_course_id: sampleCourses.math201.id,
    desired_course_id: sampleCourses.cs101.id,
    status: 'active',
    priority: 1
  }
};

// Scenario: Time conflict - Alice has CS101 (MWF 9-10), wants PHYS301 (MW 2-3:30) - should work
// But if Alice also had CS201 (TR 9:30-11), wanting MATH201 (TR 11-12:30) would conflict
const conflictScenario = {
  aliceEnrollments: [
    { student_id: sampleUsers.alice.id, course_id: sampleCourses.cs101.id },
    { student_id: sampleUsers.alice.id, course_id: sampleCourses.cs201.id } // TR 9:30-11
  ],
  bobEnrollments: [
    { student_id: sampleUsers.bob.id, course_id: sampleCourses.math201.id } // TR 11-12:30
  ],
  conflictRequest: {
    requester_id: sampleUsers.alice.id,
    from_course_id: sampleCourses.cs201.id, // TR 9:30-11
    desired_course_id: sampleCourses.math201.id // TR 11-12:30 - should work, no overlap
  }
};

const sampleCsvData = `course_code,course_title,department,credits,instructor,days,start_time,end_time,location
CS101,Introduction to Programming,Computer Science,3,Dr. Smith,MWF,9:00 AM,10:00 AM,CS Building 101
MATH201,Calculus II,Mathematics,4,Prof. Johnson,TR,11:00 AM,12:30 PM,Math Building 201
PHYS301,Quantum Mechanics,Physics,3,Dr. Wilson,MW,2:00 PM,3:30 PM,Physics Lab A`;

const invalidCsvData = `course_code,course_title,department,credits,instructor,days,start_time,end_time,location
,Invalid Course Missing Code,Computer Science,3,Dr. Smith,MWF,9:00 AM,10:00 AM,CS Building 101
CS999,Course with Invalid Time,Computer Science,3,Dr. Brown,TR,25:00 AM,26:00 AM,Invalid Location
INVALID,Course with Bad Credits,Mathematics,fifty,Prof. Johnson,XYZ,11:00 AM,10:00 AM,Math Building 201`;

module.exports = {
  sampleUsers,
  sampleCourses,
  sampleTimeSlots,
  mutualSwapScenario,
  conflictScenario,
  sampleCsvData,
  invalidCsvData
};