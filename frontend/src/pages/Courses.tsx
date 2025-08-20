import React, { useEffect, useState } from 'react';
import { Course, Enrollment } from '../types';
import api from '../config/api';
import {
  MagnifyingGlassIcon,
  DocumentArrowUpIcon,
  BookOpenIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Courses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [semester, setSemester] = useState('Fall');
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchCourses();
    fetchEnrollments();
    fetchDepartments();
  }, [search, selectedDepartment, semester, year]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        semester,
        year,
        ...(search && { search }),
        ...(selectedDepartment && { department: selectedDepartment }),
      });
      
      const response = await api.get(`/api/courses?${params}`);
      setCourses(response.data.courses || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const response = await api.get('/api/courses/enrolled');
      setEnrollments(response.data.enrollments || []);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/api/courses/departments');
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      setEnrolling(courseId);
      await api.post(`/api/courses/enroll/${courseId}`);
      toast.success('Successfully enrolled in course!');
      fetchCourses();
      fetchEnrollments();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to enroll in course';
      toast.error(message);
    } finally {
      setEnrolling(null);
    }
  };

  const handleDrop = async (courseId: string) => {
    try {
      setEnrolling(courseId);
      await api.delete(`/api/courses/enroll/${courseId}`);
      toast.success('Successfully dropped course!');
      fetchCourses();
      fetchEnrollments();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to drop course';
      toast.error(message);
    } finally {
      setEnrolling(null);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      const formData = new FormData();
      formData.append('schedule', importFile);
      formData.append('semester', semester);
      formData.append('year', year);

      await api.post('/api/courses/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Schedule imported successfully!');
      setShowImport(false);
      setImportFile(null);
      fetchCourses();
      fetchEnrollments();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to import schedule';
      toast.error(message);
    }
  };

  const isEnrolled = (courseId: string) => {
    return enrollments.some(e => e.course_id === courseId && e.enrollment_status === 'enrolled');
  };

  const formatTime = (timeSlots: any[]) => {
    if (!timeSlots || timeSlots.length === 0) return 'TBA';
    const days = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
    return timeSlots
      .map(slot => `${days[slot.day_of_week]} ${slot.start_time}-${slot.end_time}`)
      .join(', ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
        <button
          onClick={() => setShowImport(true)}
          className="btn-primary flex items-center"
        >
          <DocumentArrowUpIcon className="h-5 w-5 mr-2" />
          Import Schedule
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input-field pl-10"
                placeholder="Course code or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Department
            </label>
            <select
              className="input-field"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Semester
            </label>
            <select
              className="input-field"
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
            >
              <option value="Fall">Fall</option>
              <option value="Spring">Spring</option>
              <option value="Summer">Summer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year
            </label>
            <select
              className="input-field"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            >
              {[2024, 2025, 2026].map(y => (
                <option key={y} value={y.toString()}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Course List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {course.course_code}
                    </h3>
                    <p className="text-gray-600 font-medium">{course.course_title}</p>
                  </div>
                  <span className="text-sm text-gray-500">{course.credits} credits</span>
                </div>

                <div className="space-y-2 mb-4">
                  {course.department && (
                    <div className="flex items-center text-sm text-gray-600">
                      <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                      {course.department}
                    </div>
                  )}
                  
                  {course.instructor && (
                    <div className="flex items-center text-sm text-gray-600">
                      <UserIcon className="h-4 w-4 mr-2" />
                      {course.instructor}
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    {formatTime(course.time_slots || [])}
                  </div>
                </div>

                {course.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {course.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {course.current_enrollment || 0}
                    {course.max_capacity && ` / ${course.max_capacity}`} enrolled
                  </div>
                  
                  {isEnrolled(course.id) ? (
                    <button
                      onClick={() => handleDrop(course.id)}
                      disabled={enrolling === course.id}
                      className="btn-secondary text-sm disabled:opacity-50"
                    >
                      {enrolling === course.id ? 'Dropping...' : 'Drop'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={enrolling === course.id}
                      className="btn-primary text-sm disabled:opacity-50"
                    >
                      {enrolling === course.id ? 'Enrolling...' : 'Enroll'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {courses.length === 0 && !loading && (
        <div className="text-center py-12">
          <BookOpenIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No courses found</h3>
          <p className="text-gray-600">
            Try adjusting your search criteria or import your schedule.
          </p>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Import Course Schedule
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload a CSV file with your course schedule
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semester
                  </label>
                  <select
                    className="input-field"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                  >
                    <option value="Fall">Fall</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <select
                    className="input-field"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    {[2024, 2025, 2026].map(y => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowImport(false);
                  setImportFile(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importFile}
                className="btn-primary disabled:opacity-50"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses; 