import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Course, Enrollment } from '../types';
import api from '../config/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const CreateSwap: React.FC = () => {
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    fromCourseId: '',
    desiredCourseId: '',
    priority: 1,
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [enrollmentsRes, coursesRes] = await Promise.all([
        api.get('/api/courses/enrolled'),
        api.get('/api/courses'),
      ]);

      setEnrollments(enrollmentsRes.data.enrollments || []);
      setCourses(coursesRes.data.courses || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fromCourseId || !formData.desiredCourseId) {
      toast.error('Please select both courses');
      return;
    }

    if (formData.fromCourseId === formData.desiredCourseId) {
      toast.error('Cannot swap a course for itself');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/api/swaps/requests', formData);
      toast.success('Swap request created successfully!');
      navigate('/swaps');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create swap request';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'priority' ? parseInt(value) : value,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const enrolledCourses = enrollments.filter(e => e.enrollment_status === 'enrolled');
  const availableCourses = courses.filter(course => 
    !enrolledCourses.some(e => e.course_id === course.id)
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/swaps')}
          className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create Swap Request</h1>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="fromCourseId" className="block text-sm font-medium text-gray-700 mb-2">
              Course you want to swap from *
            </label>
            <select
              id="fromCourseId"
              name="fromCourseId"
              required
              className="input-field"
              value={formData.fromCourseId}
              onChange={handleChange}
            >
              <option value="">Select a course you're enrolled in</option>
              {enrolledCourses.map((enrollment) => (
                <option key={enrollment.id} value={enrollment.course_id}>
                  {enrollment.courses?.course_code} - {enrollment.courses?.course_title}
                </option>
              ))}
            </select>
            {enrolledCourses.length === 0 && (
              <p className="text-sm text-red-600 mt-1">
                You need to be enrolled in at least one course to create a swap request.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="desiredCourseId" className="block text-sm font-medium text-gray-700 mb-2">
              Course you want to swap to *
            </label>
            <select
              id="desiredCourseId"
              name="desiredCourseId"
              required
              className="input-field"
              value={formData.desiredCourseId}
              onChange={handleChange}
            >
              <option value="">Select desired course</option>
              {availableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.course_code} - {course.course_title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              Priority Level
            </label>
            <select
              id="priority"
              name="priority"
              className="input-field"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value={1}>Low (1)</option>
              <option value={2}>Medium (2)</option>
              <option value={3}>High (3)</option>
              <option value={4}>Very High (4)</option>
              <option value={5}>Critical (5)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Higher priority requests are matched first
            </p>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              className="input-field"
              placeholder="Any additional information about your swap request..."
              value={formData.notes}
              onChange={handleChange}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">How it works:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• We'll find students who want to swap their course for yours</li>
              <li>• You'll be notified when a match is found</li>
              <li>• Both students must confirm the match</li>
              <li>• Contact information is shared after confirmation</li>
              <li>• Complete the swap outside the platform and mark it as done</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/swaps')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || enrolledCourses.length === 0}
              className="btn-primary disabled:opacity-50"
            >
              {submitting ? 'Creating Request...' : 'Create Swap Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSwap; 