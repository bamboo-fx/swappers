import React, { useEffect, useState } from 'react';
import { Course } from '../types';
import api from '../config/api';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  BookOpenIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  StarIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface CourseRequest {
  id: string;
  priority: number;
  notes: string;
  status: string;
  created_at: string;
  expires_at: string;
  courses: Course;
}

const CourseRequests: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [requests, setRequests] = useState<CourseRequest[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [priority, setPriority] = useState(1);
  const [notes, setNotes] = useState('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [semester, setSemester] = useState('Fall');
  const [year, setYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchCourses();
    fetchRequests();
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

  const fetchRequests = async () => {
    try {
      const response = await api.get('/api/courses/requests');
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Error fetching course requests:', error);
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

  const handleRequestCourse = (course: Course) => {
    setSelectedCourse(course);
    setPriority(1);
    setNotes('');
    setShowRequestModal(true);
  };

  const submitRequest = async () => {
    if (!selectedCourse) return;

    try {
      setRequesting(selectedCourse.id);
      await api.post('/api/courses/requests', {
        courseId: selectedCourse.id,
        priority,
        notes
      });
      
      toast.success('Course request created successfully!');
      setShowRequestModal(false);
      setSelectedCourse(null);
      fetchRequests();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create course request';
      toast.error(message);
    } finally {
      setRequesting(null);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await api.delete(`/api/courses/requests/${requestId}`);
      toast.success('Course request deleted');
      fetchRequests();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to delete request';
      toast.error(message);
    }
  };

  const handleUpdatePriority = async (requestId: string, newPriority: number) => {
    try {
      await api.put(`/api/courses/requests/${requestId}`, {
        priority: newPriority
      });
      toast.success('Priority updated');
      fetchRequests();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update priority';
      toast.error(message);
    }
  };

  const isAlreadyRequested = (courseId: string) => {
    return requests.some(r => r.courses.id === courseId && r.status === 'active');
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Course Requests</h1>
        <p className="text-gray-600 mt-1">
          Request courses you want but aren't enrolled in. Our algorithm will find potential swaps for you.
        </p>
      </div>

      {/* My Requests Section */}
      {requests.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Course Requests</h2>
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {request.courses.course_code}
                      </h3>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleUpdatePriority(request.id, star)}
                            className={`h-4 w-4 ${
                              star <= request.priority ? 'text-yellow-400' : 'text-gray-300'
                            } hover:text-yellow-400`}
                          >
                            <StarIcon className="h-4 w-4 fill-current" />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-gray-500">Priority</span>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2">{request.courses.course_title}</p>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center">
                        <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                        {request.courses.department}
                      </div>
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 mr-2" />
                        {request.courses.instructor}
                      </div>
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        {formatTime(request.courses.time_slots || [])}
                      </div>
                    </div>
                    {request.notes && (
                      <p className="text-sm text-gray-600 mt-2">
                        <strong>Notes:</strong> {request.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteRequest(request.id)}
                    className="ml-4 p-1 text-gray-400 hover:text-red-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                  
                  {isAlreadyRequested(course.id) ? (
                    <span className="text-sm text-green-600 font-medium">
                      Already Requested
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRequestCourse(course)}
                      disabled={requesting === course.id}
                      className="btn-primary text-sm disabled:opacity-50 flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      {requesting === course.id ? 'Requesting...' : 'Request'}
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
            Try adjusting your search criteria to find courses to request.
          </p>
        </div>
      )}

      {/* Request Modal */}
      {showRequestModal && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Request Course: {selectedCourse.course_code}
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-700 font-medium">{selectedCourse.course_title}</p>
                <p className="text-sm text-gray-500">
                  {selectedCourse.department} • {selectedCourse.instructor}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level (1-5 stars)
                </label>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setPriority(star)}
                      className={`h-6 w-6 ${
                        star <= priority ? 'text-yellow-400' : 'text-gray-300'
                      } hover:text-yellow-400`}
                    >
                      <StarIcon className="h-6 w-6 fill-current" />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {priority === 1 && 'Low'}
                    {priority === 2 && 'Medium-Low'}
                    {priority === 3 && 'Medium'}
                    {priority === 4 && 'High'}
                    {priority === 5 && 'Very High'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Any additional notes about this request..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowRequestModal(false);
                  setSelectedCourse(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={submitRequest}
                disabled={requesting === selectedCourse.id}
                className="btn-primary disabled:opacity-50"
              >
                {requesting === selectedCourse.id ? 'Requesting...' : 'Create Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseRequests;