import React, { useEffect, useState } from 'react';
import { SwapRequest } from '../types';
import api from '../config/api';
import {
  MagnifyingGlassIcon,
  UserIcon,
  ClockIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Marketplace: React.FC = () => {
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  useEffect(() => {
    fetchMarketplaceData();
  }, [search, selectedDepartment]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMarketplaceData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(selectedDepartment && { department: selectedDepartment }),
      });
      
      const response = await api.get(`/api/swaps/marketplace?${params}`);
      setSwapRequests(response.data.swapRequests || []);
    } catch (error) {
      console.error('Error fetching marketplace data:', error);
      toast.error('Failed to fetch marketplace data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeSlots: any[]) => {
    if (!timeSlots || timeSlots.length === 0) return 'TBA';
    const days = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
    return timeSlots
      .map(slot => `${days[slot.day_of_week]} ${slot.start_time}-${slot.end_time}`)
      .join(', ');
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 5: return 'bg-red-100 text-red-800';
      case 4: return 'bg-orange-100 text-orange-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 2: return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 5: return 'Critical';
      case 4: return 'Very High';
      case 3: return 'High';
      case 2: return 'Medium';
      default: return 'Low';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-gray-600 mt-2">
          Browse swap requests from other students. Contact them directly if you're interested in their courses.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input-field pl-10"
                placeholder="Course code, title, or department..."
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
              <option value="CS">Computer Science</option>
              <option value="MATH">Mathematics</option>
              <option value="PHYS">Physics</option>
              <option value="CHEM">Chemistry</option>
              <option value="BIOL">Biology</option>
              <option value="ENG">English</option>
              <option value="HIST">History</option>
              <option value="ECON">Economics</option>
              <option value="PSYC">Psychology</option>
              <option value="SOC">Sociology</option>
            </select>
          </div>
        </div>
      </div>

      {/* Swap Requests List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : swapRequests.length === 0 ? (
        <div className="text-center py-12">
          <UserIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No swap requests found</h3>
          <p className="text-gray-600">
            Try adjusting your search criteria or check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {swapRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-6 w-6 text-primary-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {request.requester?.full_name || 'Anonymous Student'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Posted {formatDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(request.priority)}`}>
                    {getPriorityLabel(request.priority)}
                  </span>
                </div>

                {/* Course Exchange */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 gap-4">
                    {/* From Course */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">They have:</h4>
                      <div className="bg-white rounded-md p-3 border">
                        <h5 className="font-medium text-gray-900">
                          {request.from_course?.course_code} - {request.from_course?.course_title}
                        </h5>
                        <div className="mt-2 space-y-1">
                          {request.from_course?.department && (
                            <div className="flex items-center text-sm text-gray-600">
                              <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                              {request.from_course.department}
                            </div>
                          )}
                          <div className="flex items-center text-sm text-gray-600">
                            <ClockIcon className="h-4 w-4 mr-2" />
                            {formatTime(request.from_course?.time_slots || [])}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex justify-center">
                      <ArrowRightIcon className="h-6 w-6 text-gray-400" />
                    </div>

                    {/* To Course */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">They want:</h4>
                      <div className="bg-white rounded-md p-3 border border-primary-200">
                        <h5 className="font-medium text-gray-900">
                          {request.desired_course?.course_code} - {request.desired_course?.course_title}
                        </h5>
                        <div className="mt-2 space-y-1">
                          {request.desired_course?.department && (
                            <div className="flex items-center text-sm text-gray-600">
                              <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                              {request.desired_course.department}
                            </div>
                          )}
                          <div className="flex items-center text-sm text-gray-600">
                            <ClockIcon className="h-4 w-4 mr-2" />
                            {formatTime(request.desired_course?.time_slots || [])}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {request.notes && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Notes:</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-md p-3">
                      {request.notes}
                    </p>
                  </div>
                )}

                {/* Contact Info */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Interested? Create a matching swap request.
                    </div>
                    <a
                      href={`mailto:${request.requester?.email}`}
                      className="btn-primary text-sm"
                    >
                      Contact Student
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Marketplace; 