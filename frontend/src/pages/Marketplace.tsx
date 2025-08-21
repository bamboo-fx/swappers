import React, { useEffect, useState } from 'react';
import { SwapRequest } from '../types';
import api from '../config/api';
import {
  MagnifyingGlassIcon,
  UserIcon,
  ClockIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  StarIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface MarketplaceItem {
  id: string;
  type: 'swap' | 'request';
  priority: number;
  notes: string;
  created_at: string;
  expires_at: string;
  requester: {
    name: string;
  };
  from_course?: {
    course_code: string;
    course_title: string;
    department: string;
    instructor: string;
    time_slots: any[];
  };
  desired_course?: {
    course_code: string;
    course_title: string;
    department: string;
    instructor: string;
    time_slots: any[];
  };
  requested_course?: {
    course_code: string;
    course_title: string;
    department: string;
    instructor: string;
    time_slots: any[];
  };
}

const Marketplace: React.FC = () => {
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchMarketplaceData();
  }, [search, selectedDepartment, typeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMarketplaceData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(selectedDepartment && { department: selectedDepartment }),
        ...(typeFilter !== 'all' && { type: typeFilter }),
      });
      
      const response = await api.get(`/api/swaps/marketplace?${params}`);
      setMarketplaceItems(response.data.marketplaceItems || []);
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
          Browse swap offers and course requests from other students. Find opportunities for course exchanges.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input-field pl-10"
                placeholder="Course code, title, or student name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              className="input-field"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Items</option>
              <option value="swaps">Swap Offers</option>
              <option value="requests">Course Requests</option>
            </select>
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

      {/* Marketplace Items List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : marketplaceItems.length === 0 ? (
        <div className="text-center py-12">
          <UserIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
          <p className="text-gray-600">
            Try adjusting your search criteria or check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {marketplaceItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        item.type === 'swap' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {item.type === 'swap' ? (
                          <ArrowRightIcon className={`h-6 w-6 ${item.type === 'swap' ? 'text-blue-600' : 'text-green-600'}`} />
                        ) : (
                          <AcademicCapIcon className="h-6 w-6 text-green-600" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {item.requester?.name || 'Anonymous Student'}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          item.type === 'swap' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {item.type === 'swap' ? 'Swap Offer' : 'Course Request'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Posted {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon
                        key={star}
                        className={`h-4 w-4 ${
                          star <= item.priority ? 'text-yellow-400 fill-current' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Content based on type */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  {item.type === 'swap' ? (
                    // Swap Request Layout
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">They have:</h4>
                        <div className="bg-white rounded-md p-3 border">
                          <h5 className="font-medium text-gray-900">
                            {item.from_course?.course_code} - {item.from_course?.course_title}
                          </h5>
                          <div className="mt-2 space-y-1">
                            {item.from_course?.department && (
                              <div className="flex items-center text-sm text-gray-600">
                                <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                                {item.from_course.department}
                              </div>
                            )}
                            {item.from_course?.instructor && (
                              <div className="flex items-center text-sm text-gray-600">
                                <UserIcon className="h-4 w-4 mr-2" />
                                {item.from_course.instructor}
                              </div>
                            )}
                            <div className="flex items-center text-sm text-gray-600">
                              <ClockIcon className="h-4 w-4 mr-2" />
                              {formatTime(item.from_course?.time_slots || [])}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <ArrowRightIcon className="h-6 w-6 text-gray-400" />
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">They want:</h4>
                        <div className="bg-white rounded-md p-3 border border-primary-200">
                          <h5 className="font-medium text-gray-900">
                            {item.desired_course?.course_code} - {item.desired_course?.course_title}
                          </h5>
                          <div className="mt-2 space-y-1">
                            {item.desired_course?.department && (
                              <div className="flex items-center text-sm text-gray-600">
                                <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                                {item.desired_course.department}
                              </div>
                            )}
                            {item.desired_course?.instructor && (
                              <div className="flex items-center text-sm text-gray-600">
                                <UserIcon className="h-4 w-4 mr-2" />
                                {item.desired_course.instructor}
                              </div>
                            )}
                            <div className="flex items-center text-sm text-gray-600">
                              <ClockIcon className="h-4 w-4 mr-2" />
                              {formatTime(item.desired_course?.time_slots || [])}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Course Request Layout
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">They are looking for:</h4>
                      <div className="bg-white rounded-md p-3 border border-green-200">
                        <h5 className="font-medium text-gray-900">
                          {item.requested_course?.course_code} - {item.requested_course?.course_title}
                        </h5>
                        <div className="mt-2 space-y-1">
                          {item.requested_course?.department && (
                            <div className="flex items-center text-sm text-gray-600">
                              <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                              {item.requested_course.department}
                            </div>
                          )}
                          {item.requested_course?.instructor && (
                            <div className="flex items-center text-sm text-gray-600">
                              <UserIcon className="h-4 w-4 mr-2" />
                              {item.requested_course.instructor}
                            </div>
                          )}
                          <div className="flex items-center text-sm text-gray-600">
                            <ClockIcon className="h-4 w-4 mr-2" />
                            {formatTime(item.requested_course?.time_slots || [])}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        💡 If you have this course and want to swap it for something else, create a swap request!
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {item.notes && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Notes:</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-md p-3">
                      {item.notes}
                    </p>
                  </div>
                )}

                {/* Contact Info */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {item.type === 'swap' 
                        ? 'Interested? Create a matching swap request.' 
                        : 'Have this course? Create a swap offer!'}
                    </div>
                    <button
                      onClick={() => toast.info('Contact functionality coming soon!')}
                      className="btn-primary text-sm"
                    >
                      Contact Student
                    </button>
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