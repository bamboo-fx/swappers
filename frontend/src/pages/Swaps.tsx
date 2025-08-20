import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SwapRequest, SwapMatch, Enrollment } from '../types';
import api from '../config/api';
import {
  PlusIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Swaps: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'requests';
  
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [matches, setMatches] = useState<SwapMatch[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    fetchSwapRequests();
    fetchMatches();
    fetchEnrollments();
  }, []);

  const fetchSwapRequests = async () => {
    try {
      const response = await api.get('/api/swaps/requests');
      setSwapRequests(response.data.swapRequests || []);
    } catch (error) {
      console.error('Error fetching swap requests:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await api.get('/api/swaps/matches');
      setMatches(response.data.matches || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
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

  const handleConfirmMatch = async (matchId: string) => {
    try {
      setActionLoading(matchId);
      await api.post(`/api/swaps/matches/${matchId}/confirm`);
      toast.success('Match confirmed!');
      fetchMatches();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to confirm match';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectMatch = async (matchId: string) => {
    try {
      setActionLoading(matchId);
      await api.post(`/api/swaps/matches/${matchId}/reject`);
      toast.success('Match rejected');
      fetchMatches();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to reject match';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteSwap = async (matchId: string) => {
    try {
      setActionLoading(matchId);
      await api.post(`/api/swaps/matches/${matchId}/complete`);
      toast.success('Swap marked as completed!');
      fetchMatches();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to complete swap';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const fetchContactInfo = async (matchId: string) => {
    try {
      const response = await api.get(`/api/swaps/matches/${matchId}/contact`);
      setContactInfo(prev => ({ ...prev, [matchId]: response.data }));
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to get contact info';
      toast.error(message);
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      await api.delete(`/api/swaps/requests/${requestId}`);
      toast.success('Request cancelled');
      fetchSwapRequests();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to cancel request';
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      active: 'bg-blue-100 text-blue-800',
      matched: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const tabs = [
    { id: 'requests', name: 'Swap Requests' },
    { id: 'matches', name: 'Matches' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Course Swaps</h1>
        <Link to="/swaps/new" className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Swap Request
        </Link>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Swap Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              {swapRequests.length === 0 ? (
                <div className="text-center py-12">
                  <ArrowPathIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No swap requests</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first swap request to get started.
                  </p>
                  <Link to="/swaps/new" className="btn-primary">
                    Create Swap Request
                  </Link>
                </div>
              ) : (
                swapRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {request.from_course?.course_code} → {request.desired_course?.course_code}
                          </h3>
                          {getStatusBadge(request.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">From Course</h4>
                            <p className="text-sm text-gray-900">{request.from_course?.course_title}</p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Desired Course</h4>
                            <p className="text-sm text-gray-900">{request.desired_course?.course_title}</p>
                          </div>
                        </div>

                        {request.notes && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Notes</h4>
                            <p className="text-sm text-gray-600">{request.notes}</p>
                          </div>
                        )}

                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <span>Created: {formatDate(request.created_at)}</span>
                          <span>Priority: {request.priority}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {request.status === 'active' && (
                          <button
                            onClick={() => cancelRequest(request.id)}
                            disabled={actionLoading === request.id}
                            className="btn-secondary text-sm disabled:opacity-50"
                          >
                            {actionLoading === request.id ? 'Cancelling...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Matches Tab */}
          {activeTab === 'matches' && (
            <div className="space-y-4">
              {matches.length === 0 ? (
                <div className="text-center py-12">
                  <UserIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
                  <p className="text-gray-600">
                    Your swap requests will appear here when matched with other students.
                  </p>
                </div>
              ) : (
                matches.map((match) => (
                  <div key={match.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            Course Swap Match
                          </h3>
                          {getStatusBadge(match.match_status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Your Course</h4>
                            <p className="text-sm text-gray-900">
                              {match.course_a?.course_code} - {match.course_a?.course_title}
                            </p>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-1">Their Course</h4>
                            <p className="text-sm text-gray-900">
                              {match.course_b?.course_code} - {match.course_b?.course_title}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center text-sm text-gray-500 space-x-4">
                          <span>Matched: {formatDate(match.matched_at)}</span>
                          {match.confirmed_at && (
                            <span>Confirmed: {formatDate(match.confirmed_at)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    {match.match_status === 'confirmed' && (
                      <div className="border-t border-gray-200 pt-4 mb-4">
                        {contactInfo[match.id] ? (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Contact Information</h4>
                            <div className="space-y-2">
                              <div className="flex items-center text-sm">
                                <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                                {contactInfo[match.id].student_info.full_name}
                              </div>
                              <div className="flex items-center text-sm">
                                <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                                {contactInfo[match.id].student_info.email}
                              </div>
                              {contactInfo[match.id].student_info.phone_number && (
                                <div className="flex items-center text-sm">
                                  <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                                  {contactInfo[match.id].student_info.phone_number}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => fetchContactInfo(match.id)}
                            className="btn-secondary text-sm"
                          >
                            View Contact Info
                          </button>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {match.match_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleConfirmMatch(match.id)}
                            disabled={actionLoading === match.id}
                            className="btn-primary text-sm disabled:opacity-50 flex items-center"
                          >
                            <CheckIcon className="h-4 w-4 mr-1" />
                            {actionLoading === match.id ? 'Confirming...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => handleRejectMatch(match.id)}
                            disabled={actionLoading === match.id}
                            className="btn-secondary text-sm disabled:opacity-50 flex items-center"
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            Reject
                          </button>
                        </>
                      )}

                      {match.match_status === 'confirmed' && !match.student_a_completed && !match.student_b_completed && (
                        <button
                          onClick={() => handleCompleteSwap(match.id)}
                          disabled={actionLoading === match.id}
                          className="btn-primary text-sm disabled:opacity-50"
                        >
                          {actionLoading === match.id ? 'Completing...' : 'Mark as Completed'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Swaps; 