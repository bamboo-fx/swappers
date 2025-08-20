import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Course, SwapRequest, SwapMatch, Enrollment } from '../types';
import api from '../config/api';
import {
  BookOpenIcon,
  ArrowPathIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [matches, setMatches] = useState<SwapMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [enrollmentsRes, requestsRes, matchesRes] = await Promise.all([
          api.get('/api/courses/enrolled'),
          api.get('/api/swaps/requests?limit=5'),
          api.get('/api/swaps/matches?limit=5'),
        ]);

        setEnrollments(enrollmentsRes.data.enrollments || []);
        setSwapRequests(requestsRes.data.swapRequests || []);
        setMatches(matchesRes.data.matches || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const stats = [
    {
      name: 'Enrolled Courses',
      value: enrollments.length,
      icon: BookOpenIcon,
      color: 'bg-blue-500',
      href: '/courses',
    },
    {
      name: 'Active Swap Requests',
      value: swapRequests.filter(r => r.status === 'active').length,
      icon: ArrowPathIcon,
      color: 'bg-yellow-500',
      href: '/swaps',
    },
    {
      name: 'Pending Matches',
      value: matches.filter(m => m.match_status === 'pending').length,
      icon: UserGroupIcon,
      color: 'bg-green-500',
      href: '/swaps?tab=matches',
    },
    {
      name: 'Completed Swaps',
      value: matches.filter(m => m.match_status === 'completed').length,
      icon: ChartBarIcon,
      color: 'bg-purple-500',
      href: '/swaps?tab=matches',
    },
  ];

  const formatTime = (timeSlots: any[]) => {
    if (!timeSlots || timeSlots.length === 0) return 'TBA';
    const days = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];
    return timeSlots
      .map(slot => `${days[slot.day_of_week]} ${slot.start_time}-${slot.end_time}`)
      .join(', ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.full_name || user?.email}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's an overview of your course swap activity.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Courses */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Your Courses</h2>
              <Link
                to="/courses"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {enrollments.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                <BookOpenIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No courses enrolled yet.</p>
                <Link to="/courses" className="text-primary-600 hover:text-primary-500">
                  Browse courses
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {enrollments.slice(0, 3).map((enrollment) => (
                  <div key={enrollment.id} className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {enrollment.courses?.course_code} - {enrollment.courses?.course_title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {formatTime(enrollment.courses?.time_slots || [])}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {enrollment.courses?.credits} credits
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Swap Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Recent Swap Activity</h2>
              <Link
                to="/swaps"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {swapRequests.length === 0 && matches.length === 0 ? (
              <div className="text-center text-gray-500 py-4">
                <ArrowPathIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>No swap activity yet.</p>
                <Link to="/swaps" className="text-primary-600 hover:text-primary-500">
                  Create swap request
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Recent Matches */}
                {matches.slice(0, 2).map((match) => (
                  <div key={match.id} className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Match Found
                      </h3>
                      <p className="text-xs text-gray-500">
                        {match.course_a?.course_code} ↔ {match.course_b?.course_code}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      match.match_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      match.match_status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      match.match_status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {match.match_status}
                    </span>
                  </div>
                ))}

                {/* Recent Requests */}
                {swapRequests.slice(0, 2).map((request) => (
                  <div key={request.id} className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        Swap Request
                      </h3>
                      <p className="text-xs text-gray-500">
                        {request.from_course?.course_code} → {request.desired_course?.course_code}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      request.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      request.status === 'matched' ? 'bg-green-100 text-green-800' :
                      request.status === 'completed' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/courses"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BookOpenIcon className="h-6 w-6 text-primary-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Browse Courses</span>
          </Link>
          <Link
            to="/swaps/new"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowPathIcon className="h-6 w-6 text-primary-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Create Swap Request</span>
          </Link>
          <Link
            to="/marketplace"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <UserGroupIcon className="h-6 w-6 text-primary-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Browse Marketplace</span>
          </Link>
          <Link
            to="/profile"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChartBarIcon className="h-6 w-6 text-primary-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Update Profile</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 