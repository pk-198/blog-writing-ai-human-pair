/**
 * Reviewer Dashboard - Lists all blog sessions for review
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRole, clearAuth, getToken } from '@/lib/auth';
import { api, ReviewerStatsResponse } from '@/lib/api';
import StatCard from '@/components/shared/StatCard';

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
  const [stats, setStats] = useState<ReviewerStatsResponse | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [timeWindow, setTimeWindow] = useState<'10d' | '30d' | 'all'>('30d');
  const [showDetailedSkipTable, setShowDetailedSkipTable] = useState(false);

  useEffect(() => {
    const userRole = getRole();
    if (!userRole || userRole !== 'reviewer') {
      router.push('/login');
      return;
    }
    setRole(userRole);
    loadSessions();
    loadStats();
  }, [router]);

  useEffect(() => {
    // Reload stats when time window changes
    loadStats();
  }, [timeWindow]);

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

  const loadStats = async () => {
    setIsLoadingStats(true);
    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const statsResponse = await api.getReviewerStats(timeWindow, token);
      setStats(statsResponse);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    } finally {
      setIsLoadingStats(false);
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

  const basicStats = {
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
        {/* Basic Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Sessions</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{basicStats.total}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Completed</div>
            <div className="text-3xl font-bold text-green-600 mt-2">{basicStats.completed}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Active</div>
            <div className="text-3xl font-bold text-blue-600 mt-2">{basicStats.active}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Paused</div>
            <div className="text-3xl font-bold text-yellow-600 mt-2">{basicStats.paused}</div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Analytics & Quality Metrics</h2>
            {/* Time window toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setTimeWindow('10d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeWindow === '10d'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                10 Days
              </button>
              <button
                onClick={() => setTimeWindow('30d')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeWindow === '30d'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeWindow('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeWindow === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Time
              </button>
            </div>
          </div>

          {isLoadingStats ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading analytics...</p>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Productivity Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Productivity</h3>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard
                    title="Completed (10d)"
                    value={stats.productivity.completed_10d}
                    colorScheme="green"
                    size="small"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  />
                  <StatCard
                    title="Completed (30d)"
                    value={stats.productivity.completed_30d}
                    colorScheme="green"
                    size="small"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    }
                  />
                  <StatCard
                    title="Total Sessions"
                    value={stats.productivity.total_sessions}
                    colorScheme="blue"
                    size="small"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    }
                  />
                </div>
              </div>

              {/* Data Collection Effort */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Collection Effort ({stats.data_collection.session_count} completed sessions)</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <StatCard
                    title="Avg Data Points"
                    value={stats.data_collection.avg_data_points.toFixed(1)}
                    subtitle={`${stats.data_collection.total_data_points} total`}
                    colorScheme="blue"
                    size="small"
                  />
                  <StatCard
                    title="Avg Tools"
                    value={stats.data_collection.avg_tools.toFixed(1)}
                    subtitle={`${stats.data_collection.total_tools} total`}
                    colorScheme="green"
                    size="small"
                  />
                  <StatCard
                    title="Avg Resource Links"
                    value={stats.data_collection.avg_resource_links.toFixed(1)}
                    subtitle={`${stats.data_collection.total_resource_links} total`}
                    colorScheme="indigo"
                    size="small"
                  />
                  <StatCard
                    title="Avg Credibility"
                    value={stats.data_collection.avg_credibility_elements.toFixed(1)}
                    subtitle={`${stats.data_collection.total_credibility_elements} total`}
                    colorScheme="yellow"
                    size="small"
                  />
                  <StatCard
                    title="Avg FAQs"
                    value={stats.data_collection.avg_faqs.toFixed(1)}
                    subtitle={`${stats.data_collection.total_faqs} total (human)`}
                    colorScheme="gray"
                    size="small"
                  />
                  <StatCard
                    title="Avg Prompts Copied"
                    value={stats.data_collection.avg_prompts_copied.toFixed(1)}
                    subtitle={`${stats.data_collection.total_prompts_copied} total`}
                    colorScheme="indigo"
                    size="small"
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    }
                  />
                </div>
              </div>

              {/* Time Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Time Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    title="Avg Session Duration"
                    value={`${stats.time_metrics.avg_session_duration_hours.toFixed(1)}h`}
                    subtitle="all sessions"
                    colorScheme="blue"
                    size="small"
                  />
                  <StatCard
                    title="Avg Completion Time"
                    value={stats.time_metrics.avg_completion_time_hours > 0 ? `${stats.time_metrics.avg_completion_time_hours.toFixed(1)}h` : 'N/A'}
                    subtitle={`${stats.time_metrics.completed_count} completed`}
                    colorScheme="green"
                    size="small"
                  />
                  <StatCard
                    title="Fastest Completion"
                    value={stats.time_metrics.fastest_completion_hours > 0 ? `${stats.time_metrics.fastest_completion_hours.toFixed(1)}h` : 'N/A'}
                    colorScheme="green"
                    size="small"
                  />
                  <StatCard
                    title="Slowest Completion"
                    value={stats.time_metrics.slowest_completion_hours > 0 ? `${stats.time_metrics.slowest_completion_hours.toFixed(1)}h` : 'N/A'}
                    colorScheme="yellow"
                    size="small"
                  />
                </div>
              </div>

              {/* Quality Indicators */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Quality Indicators</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <StatCard
                    title="Overall Skip Rate"
                    value={`${stats.quality_indicators.overall_skip_rate}%`}
                    subtitle={`${stats.quality_indicators.total_steps_skipped} of ${stats.quality_indicators.total_steps_encountered} steps`}
                    colorScheme={stats.quality_indicators.overall_skip_rate > 25 ? 'red' : stats.quality_indicators.overall_skip_rate > 10 ? 'yellow' : 'green'}
                    size="small"
                  />
                  {stats.quality_indicators.most_skipped_step && (
                    <div className="md:col-span-2">
                      <StatCard
                        title="Most Skipped Step"
                        value={`Step ${stats.quality_indicators.most_skipped_step.step_number}: ${stats.quality_indicators.most_skipped_step.step_name}`}
                        subtitle={`${stats.quality_indicators.most_skipped_step.times_skipped} times`}
                        colorScheme="red"
                        size="small"
                      />
                    </div>
                  )}
                </div>

                {/* Skip Rate Table Toggle */}
                <button
                  onClick={() => setShowDetailedSkipTable(!showDetailedSkipTable)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {showDetailedSkipTable ? '▲ Hide' : '▼ Show'} Detailed Skip Analysis (All 22 Steps)
                </button>

                {showDetailedSkipTable && (
                  <div className="mt-4 bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Step</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Step Name</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Encountered</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Skipped</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Skip Rate</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Common Reasons</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {stats.quality_indicators.skip_by_step.map((step) => (
                            <tr key={step.step_number} className={step.times_encountered === 0 ? 'bg-gray-50 text-gray-400' : ''}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{step.step_number}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{step.step_name}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-600">{step.times_encountered}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-600">{step.times_skipped}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  step.skip_rate === 0 ? 'bg-green-100 text-green-800' :
                                  step.skip_rate < 25 ? 'bg-yellow-100 text-yellow-800' :
                                  step.skip_rate < 50 ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {step.skip_rate}%
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {step.skip_reasons && step.skip_reasons.length > 0 ? (
                                  <ul className="list-disc list-inside">
                                    {step.skip_reasons.slice(0, 2).map((reason, idx) => (
                                      <li key={idx} className="text-xs">{reason.length > 50 ? reason.substring(0, 50) + '...' : reason}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-gray-400 italic">None</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
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
