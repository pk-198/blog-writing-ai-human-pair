/**
 * Reviewer Dashboard - Lists all blog sessions for review
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRole, clearAuth, getToken } from '@/lib/auth';
import { api } from '@/lib/api';

interface SessionItem {
  session_id: string;
  primary_keyword: string;
  blog_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  current_step: number;
  total_steps: number;
  progress_percentage: number;
  steps_completed: number;
  steps_skipped: number;
}

export default function ReviewerDashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const userRole = getRole();
    if (!userRole || userRole !== 'reviewer') {
      router.push('/login');
      return;
    }
    setRole(userRole);
    loadSessions();
  }, [router]);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await api.listAllSessions(undefined, token);
      setSessions(response.sessions);
      setFilteredSessions(response.sessions);
    } catch (err: any) {
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters whenever search or status filter changes
  useEffect(() => {
    let filtered = sessions;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(s =>
        s.primary_keyword.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.session_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredSessions(filtered);
  }, [statusFilter, searchQuery, sessions]);

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const stats = {
    total: sessions.length,
    completed: sessions.filter(s => s.status === 'completed').length,
    active: sessions.filter(s => s.status === 'active').length,
    paused: sessions.filter(s => s.status === 'paused').length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reviewer Dashboard</h1>
            <p className="text-sm text-gray-600">Blog Creation System - Audit Mode</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Sessions</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Completed</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Active</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{stats.active}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Paused</div>
            <div className="text-3xl font-bold text-yellow-600 mt-2">{stats.paused}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by keyword or session ID..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredSessions.length} of {sessions.length} sessions
            </div>
            <button
              onClick={loadSessions}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Sessions List */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-600">Loading sessions...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-red-800 font-semibold mb-2">Error</div>
            <div className="text-red-700">{error}</div>
            <button
              onClick={loadSessions}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredSessions.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-4xl mb-4">📄</div>
            <div className="text-gray-900 font-semibold mb-2">No sessions found</div>
            <div className="text-gray-600">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No blog sessions have been created yet'}
            </div>
          </div>
        )}

        {!loading && !error && filteredSessions.length > 0 && (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <div
                key={session.session_id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
                onClick={() => router.push(`/reviewer/session/${session.session_id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {session.primary_keyword}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(session.status)}`}>
                        {session.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {session.blog_type.length > 150
                        ? session.blog_type.substring(0, 150) + '...'
                        : session.blog_type}
                    </p>
                    <div className="text-xs text-gray-500">
                      Session ID: {session.session_id}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-700">
                      Step {session.current_step} of {session.total_steps}
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {session.progress_percentage}%
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getProgressColor(session.progress_percentage)}`}
                      style={{ width: `${session.progress_percentage}%` }}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <div>
                      ✅ <span className="font-medium">{session.steps_completed}</span> completed
                    </div>
                    {session.steps_skipped > 0 && (
                      <div>
                        ⏭️ <span className="font-medium">{session.steps_skipped}</span> skipped
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-500">Updated:</span> {formatDate(session.updated_at)}
                  </div>
                </div>

                {/* View Button */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/reviewer/session/${session.session_id}`);
                    }}
                  >
                    View Workflow & Plagiarism Report →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
