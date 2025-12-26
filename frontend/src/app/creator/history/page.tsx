'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, SessionListItem, PaginationInfo, SessionError } from '@/lib/api';
import { getToken, getRole } from '@/lib/auth';
import SessionCard from '@/components/creator/SessionCard';

export default function CreatorHistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [sessionErrors, setSessionErrors] = useState<SessionError[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // Verify user is authenticated as creator
  useEffect(() => {
    const userRole = getRole();
    if (!userRole || userRole !== 'creator') {
      router.push('/login');
      return;
    }
  }, [router]);

  // Load sessions when page, search, or filter changes
  useEffect(() => {
    loadSessions();
  }, [currentPage, statusFilter]);

  // Reset to page 1 when search changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadSessions();
    }
  }, [searchTerm]);

  const loadSessions = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const statusFilterValue = statusFilter === 'all' ? undefined : statusFilter;
      const response = await api.listCreatorSessions(
        statusFilterValue,
        currentPage,
        pageSize,
        token
      );

      setSessions(response.sessions);
      setPagination(response.pagination);
      setSessionErrors(response.errors || []);
    } catch (err: any) {
      console.error('Error loading sessions:', err);
      setError(err.message || 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  };

  // Client-side search filter (applied to current page results)
  const filteredSessions = searchTerm
    ? sessions.filter(
        (session) =>
          session.primary_keyword.toLowerCase().includes(searchTerm.toLowerCase()) ||
          session.session_id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : sessions;

  const handleViewSession = (sessionId: string) => {
    // Find the session to check its status
    const session = sessions.find(s => s.session_id === sessionId);

    // Safety check: If session not found in current list, don't navigate
    if (!session) {
      console.error(`Session ${sessionId} not found in current session list`);
      alert('Session not found. Please refresh the page and try again.');
      return;
    }

    // If active or paused, navigate to current step for quick resume
    if (session.status === 'active' || session.status === 'paused') {
      router.push(`/creator/session/${sessionId}/step/${session.current_step}`);
    } else {
      // For completed/expired sessions, show overview page
      router.push(`/creator/session/${sessionId}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Session History
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                View all your blog creation sessions and workflows
              </p>
            </div>
            <button
              onClick={() => router.push('/creator/dashboard')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Warning for corrupted sessions */}
        {sessionErrors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg
                className="h-6 w-6 text-yellow-600 mr-3 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h3 className="text-yellow-800 font-medium">
                  Warning: {sessionErrors.length} session{sessionErrors.length > 1 ? 's' : ''} could not be loaded
                </h3>
                <p className="text-yellow-700 text-sm mt-1">
                  Some sessions may have corrupted data. Check logs for details.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-500">
                Total Sessions {statusFilter !== 'all' && `(${statusFilter})`}
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900">
                {pagination?.total_count || 0}
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Page {pagination?.page || 1} of {pagination?.total_pages || 1}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by keyword or session ID
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search sessions..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredSessions.length} of {sessions.length} sessions
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading sessions...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <svg
                className="h-6 w-6 text-red-600 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
            <button
              onClick={loadSessions}
              className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Sessions Grid */}
        {!isLoading && !error && filteredSessions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map((session) => (
              <SessionCard
                key={session.session_id}
                session={session}
                onViewSession={handleViewSession}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && !error && pagination && pagination.total_pages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            {/* Previous Button */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!pagination.has_prev}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                pagination.has_prev
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              ← Previous
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-2">
              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map((pageNum) => {
                // Show first page, last page, current page, and pages around current
                const showPage =
                  pageNum === 1 ||
                  pageNum === pagination.total_pages ||
                  Math.abs(pageNum - currentPage) <= 1;

                if (!showPage) {
                  // Show ellipsis
                  if (
                    pageNum === 2 && currentPage > 3 ||
                    pageNum === pagination.total_pages - 1 && currentPage < pagination.total_pages - 2
                  ) {
                    return <span key={pageNum} className="px-2 text-gray-400">...</span>;
                  }
                  return null;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                      pageNum === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!pagination.has_next}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                pagination.has_next
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Next →
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredSessions.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {searchTerm || statusFilter !== 'all'
                ? 'No sessions match your filters'
                : 'No sessions yet'}
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first blog session to get started'}
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
