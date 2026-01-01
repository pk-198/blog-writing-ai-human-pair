/**
 * Creator Dashboard - Main interface for blog creators
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRole, clearAuth, getToken } from '@/lib/auth';
import { api, CreatorStatsResponse } from '@/lib/api';
import StatCard from '@/components/shared/StatCard';

export default function CreatorDashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showWebinarModal, setShowWebinarModal] = useState(false);
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [blogType, setBlogType] = useState('');
  const [webinarTopic, setWebinarTopic] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestCredentials, setGuestCredentials] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [contentFormat, setContentFormat] = useState<'ghostwritten' | 'conversational'>('ghostwritten');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [stats, setStats] = useState<CreatorStatsResponse | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [timeWindow, setTimeWindow] = useState<'10d' | '30d' | 'all'>('all');

  useEffect(() => {
    const userRole = getRole();
    if (!userRole || userRole !== 'creator') {
      router.push('/login');
      return;
    }
    setRole(userRole);
    loadActiveSessions();
    loadStats();
  }, [router]);

  useEffect(() => {
    // Reload stats when time window changes
    loadStats();
  }, [timeWindow]);

  const loadActiveSessions = async () => {
    setIsLoadingSessions(true);
    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch both standard blog sessions and webinar sessions in parallel
      const [blogResponse, webinarResponse] = await Promise.all([
        api.listActiveSessions(token).catch(() => ({ sessions: [] })),
        api.listActiveWebinarSessions(token).catch(() => ({ sessions: [] }))
      ]);

      // Merge both lists and sort by updated_at
      const allSessions = [
        ...(blogResponse.sessions || []).map(s => ({ ...s, session_type: 'blog' })),
        ...(webinarResponse.sessions || [])
      ].sort((a, b) => {
        const dateA = new Date(a.updated_at || 0).getTime();
        const dateB = new Date(b.updated_at || 0).getTime();
        return dateB - dateA; // Most recent first
      });

      setActiveSessions(allSessions);
    } catch (err) {
      console.error('Failed to load active sessions:', err);
    } finally {
      setIsLoadingSessions(false);
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

      const statsResponse = await api.getCreatorStats(timeWindow, token);
      setStats(statsResponse);
    } catch (err) {
      console.error('Failed to load statistics:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  const handleStartNewBlog = () => {
    setShowModal(true);
    setPrimaryKeyword('');
    setBlogType('');
    setError('');
  };

  const handleStartWebinarBlog = () => {
    setShowWebinarModal(true);
    setWebinarTopic('');
    setGuestName('');
    setGuestCredentials('');
    setTargetAudience('');
    setContentFormat('ghostwritten');
    setError('');
  };

  const handleCreateWebinarSession = async () => {
    if (!webinarTopic.trim()) {
      setError('Please enter a webinar topic');
      return;
    }

    if (webinarTopic.trim().length < 10) {
      setError('Webinar topic must be at least 10 characters');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const session = await api.createWebinarSession(
        {
          webinar_topic: webinarTopic,
          guest_name: guestName || undefined,
          guest_credentials: guestCredentials || undefined,
          target_audience: targetAudience || undefined,
          content_format: contentFormat
        },
        token
      );

      // Redirect to webinar Step 1
      router.push(`/creator/webinar-session/${session.session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create webinar session');
      setIsCreating(false);
    }
  };

  const handleCreateSession = async () => {
    if (!primaryKeyword.trim()) {
      setError('Please enter a primary keyword');
      return;
    }

    if (!blogType.trim()) {
      setError('Please enter a blog type');
      return;
    }

    // Validate word count (minimum 10 words)
    const wordCount = blogType.trim().split(/\s+/).length;
    if (wordCount < 10) {
      setError(`Blog type must contain at least 10 words. Current count: ${wordCount}`);
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const session = await api.createSession(
        {
          primary_keyword: primaryKeyword,
          blog_type: blogType
        },
        token
      );

      // Redirect to Step 1
      router.push(`/creator/session/${session.session_id}/step/1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
      setIsCreating(false);
    }
  };

  if (!role) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Creator Dashboard</h1>
            <p className="text-sm text-gray-600">Blog Creation System</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/creator/history')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              View History
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <div className="text-4xl mr-4">✅</div>
            <div>
              <h2 className="text-2xl font-semibold text-green-600">Login Successful!</h2>
              <p className="text-gray-600">You are logged in as Creator</p>
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Statistics</h2>
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
              <p className="mt-2 text-gray-600">Loading statistics...</p>
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Productivity Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Productivity</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    title="Completed (10d)"
                    value={stats.productivity.completed_10d}
                    colorScheme="green"
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
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    }
                  />
                  <StatCard
                    title="Completion Rate"
                    value={`${stats.productivity.completion_rate}%`}
                    colorScheme="indigo"
                    trend={stats.trends.trend}
                    trendLabel={
                      stats.trends.trend === 'improving' ? 'Improving' :
                      stats.trends.trend === 'declining' ? 'Declining' :
                      'Stable'
                    }
                    icon={
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    }
                  />
                </div>
              </div>

              {/* Efficiency Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Efficiency</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard
                    title="Avg Completion Time"
                    value={`${stats.efficiency.avg_completion_time_hours.toFixed(1)}h`}
                    colorScheme="blue"
                    subtitle={stats.efficiency.avg_completion_time_hours > 0 ? 'per blog' : 'N/A'}
                  />
                  <StatCard
                    title="Fastest Completion"
                    value={stats.efficiency.fastest_completion_hours > 0 ? `${stats.efficiency.fastest_completion_hours.toFixed(1)}h` : 'N/A'}
                    colorScheme="green"
                  />
                  <StatCard
                    title="Slowest Completion"
                    value={stats.efficiency.slowest_completion_hours > 0 ? `${stats.efficiency.slowest_completion_hours.toFixed(1)}h` : 'N/A'}
                    colorScheme="yellow"
                  />
                </div>
              </div>

              {/* Most Skipped Steps */}
              {stats.efficiency.top_skipped_steps && stats.efficiency.top_skipped_steps.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Most Skipped Steps</h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="space-y-2">
                      {stats.efficiency.top_skipped_steps.map((step) => (
                        <div key={step.step_number} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                          <div>
                            <span className="font-medium text-gray-900">Step {step.step_number}: {step.step_name}</span>
                            <span className="text-sm text-gray-600 ml-2">
                              ({step.times_skipped} of {step.times_encountered} times)
                            </span>
                          </div>
                          <span className={`font-bold ${
                            step.skip_rate > 50 ? 'text-red-600' :
                            step.skip_rate > 25 ? 'text-yellow-600' :
                            'text-gray-600'
                          }`}>
                            {step.skip_rate}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Active Sessions Card */}
          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Active Sessions {activeSessions.length > 0 && `(${activeSessions.length})`}
              </h3>
              {activeSessions.length > 3 && (
                <button
                  onClick={() => router.push('/creator/history')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All →
                </button>
              )}
            </div>

            {isLoadingSessions ? (
              <div className="text-gray-600 mb-4">Loading sessions...</div>
            ) : activeSessions.length > 0 ? (
              <div className="space-y-3">
                {activeSessions.slice(0, 3).map((session: any) => {
                  // Determine session type and styling
                  const isWebinar = session.session_type === 'webinar';
                  const bgColor = isWebinar ? 'bg-purple-50' : 'bg-green-50';
                  const borderColor = isWebinar ? 'border-purple-200' : 'border-green-200';
                  const textColor = isWebinar ? 'text-purple-900' : 'text-green-900';
                  const progressBg = isWebinar ? 'border-purple-300' : 'border-green-300';
                  const progressBar = isWebinar ? 'bg-purple-600' : 'bg-green-600';
                  const buttonColor = isWebinar ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700';

                  // Display title based on session type
                  const displayTitle = isWebinar ? session.webinar_topic : session.primary_keyword;

                  // Icon based on session type
                  const icon = isWebinar ? '🎥' : '📝';

                  // Resume path based on session type
                  const resumePath = isWebinar
                    ? `/creator/webinar-session/${session.session_id}`
                    : `/creator/session/${session.session_id}/step/${session.current_step}`;

                  return (
                    <div key={session.session_id} className={`${bgColor} border ${borderColor} rounded-lg p-4`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{session.status === 'paused' ? '⏸️' : icon}</span>
                            <h4 className={`font-semibold ${textColor} line-clamp-1`}>{displayTitle}</h4>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                            <p>
                              <span className="font-medium">Step:</span> {session.current_step} of {session.total_steps || 22}
                            </p>
                            <p>
                              <span className="font-medium">Progress:</span> {session.progress_percentage?.toFixed(0)}%
                            </p>
                            <p>
                              <span className="font-medium">Status:</span> {session.status === 'paused' ? 'Paused' : 'Active'}
                            </p>
                            <p>
                              <span className="font-medium">Updated:</span> {new Date(session.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className={`mt-2 bg-white rounded border ${progressBg} overflow-hidden`}>
                            <div className={`h-1.5 ${progressBar}`} style={{ width: `${session.progress_percentage || 0}%` }}></div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => router.push(resumePath)}
                            className={`whitespace-nowrap ${buttonColor} text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors`}
                          >
                            Resume
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activeSessions.length === 0 && (
                  <p className="text-gray-600 text-center py-4">No active or paused sessions</p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No active sessions</p>
                <button
                  onClick={handleStartNewBlog}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  Start New Blog
                </button>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6 md:col-span-2">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <ul className="grid grid-cols-2 md:grid-cols-4 gap-4 text-gray-600">
              <li className="flex flex-col">
                <span className="text-2xl font-bold text-indigo-600">{activeSessions.length}</span>
                <span className="text-sm">Active Sessions</span>
              </li>
              <li className="flex flex-col">
                <span className="text-2xl font-bold text-green-600">{activeSessions.filter(s => s.status === 'active').length}</span>
                <span className="text-sm">In Progress</span>
              </li>
              <li className="flex flex-col">
                <span className="text-2xl font-bold text-yellow-600">{activeSessions.filter(s => s.status === 'paused').length}</span>
                <span className="text-sm">Paused</span>
              </li>
              <li className="flex flex-col">
                <span className="text-2xl font-bold text-blue-600">
                  {activeSessions.length > 0 ? Math.round(activeSessions.reduce((sum, s) => sum + (s.progress_percentage || 0), 0) / activeSessions.length) : 0}%
                </span>
                <span className="text-sm">Avg Progress</span>
              </li>
            </ul>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleStartNewBlog}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                + Start New Blog
              </button>
              <button
                onClick={handleStartWebinarBlog}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.55 3.4a1 1 0 010 1.6L15 18v-8zM5 6h8a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z" />
                </svg>
                Webinar Blog
              </button>
              <button
                onClick={() => router.push('/creator/history')}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                View All Sessions
              </button>
            </div>
          </div>

          {/* Session Expiry Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:col-span-2">
            <p className="text-sm text-blue-800">
              ℹ️ <strong>Note:</strong> Sessions automatically expire 5 days after creation. Make sure to complete your blogs within this timeframe.
            </p>
          </div>
        </div>

        {/* Coming Soon Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">🚀 Ready to Start!</h3>
          <p className="text-blue-700">
            Click "Start New Blog" to begin the 22-step workflow. You'll be prompted to enter a
            primary keyword to get started.
          </p>
        </div>
      </main>

      {/* Start New Blog Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Start New Blog</h2>
            <p className="text-gray-600 mb-6">
              Enter the primary keyword you want to target for this blog post.
            </p>

            <div className="mb-4">
              <label htmlFor="keyword" className="block text-sm font-medium text-gray-700 mb-2">
                Primary Keyword *
              </label>
              <input
                type="text"
                id="keyword"
                value={primaryKeyword}
                onChange={(e) => setPrimaryKeyword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="e.g., 'SEO best practices 2024'"
                disabled={isCreating}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="blogType" className="block text-sm font-medium text-gray-700 mb-2">
                Blog Type & Purpose * (minimum 10 words)
              </label>
              <textarea
                id="blogType"
                value={blogType}
                onChange={(e) => setBlogType(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-y"
                placeholder="e.g., 'webinar: Summary of our expert webinar on voice AI featuring John Doe, covering best practices and implementation strategies' or 'comparison: Detailed comparison between two voice AI platforms analyzing features, pricing, and use cases for enterprise customers'"
                disabled={isCreating}
              />
              <p className="text-xs text-gray-500 mt-1">
                Word count: {blogType.trim() ? blogType.trim().split(/\s+/).length : 0} / 10 minimum
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCreateSession}
                disabled={isCreating || !primaryKeyword.trim() || !blogType.trim() || blogType.trim().split(/\s+/).length < 10}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {isCreating ? 'Creating...' : 'Start Workflow'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={isCreating}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Webinar Blog Modal */}
      {showWebinarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.55 3.4a1 1 0 010 1.6L15 18v-8zM5 6h8a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900">Create Blog from Webinar</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Enter webinar details to start the 15-step webinar-to-blog workflow.
            </p>

            <div className="mb-4">
              <label htmlFor="webinarTopic" className="block text-sm font-medium text-gray-700 mb-2">
                Webinar Topic * (min 10 characters)
              </label>
              <input
                type="text"
                id="webinarTopic"
                value={webinarTopic}
                onChange={(e) => setWebinarTopic(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="e.g., 'Building AI Calling Agents with Voice AI'"
                disabled={isCreating}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-2">
                Guest Name (optional)
              </label>
              <input
                type="text"
                id="guestName"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="e.g., 'John Doe'"
                disabled={isCreating}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="guestCredentials" className="block text-sm font-medium text-gray-700 mb-2">
                Guest Credentials (optional)
              </label>
              <input
                type="text"
                id="guestCredentials"
                value={guestCredentials}
                onChange={(e) => setGuestCredentials(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="e.g., 'CEO at VoiceAI Inc, AI Expert'"
                disabled={isCreating}
              />
            </div>

            <div className="mb-4">
              <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 mb-2">
                Target Audience (optional)
              </label>
              <input
                type="text"
                id="targetAudience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                placeholder="e.g., 'developers', 'CTOs', 'product managers'"
                disabled={isCreating}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Format
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="contentFormat"
                    value="ghostwritten"
                    checked={contentFormat === 'ghostwritten'}
                    onChange={(e) => setContentFormat(e.target.value as 'ghostwritten')}
                    className="mr-2"
                    disabled={isCreating}
                  />
                  <span className="text-sm">Ghostwritten (Guest POV)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="contentFormat"
                    value="conversational"
                    checked={contentFormat === 'conversational'}
                    onChange={(e) => setContentFormat(e.target.value as 'conversational')}
                    className="mr-2"
                    disabled={isCreating}
                  />
                  <span className="text-sm">Conversational (Host + Guest)</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Ghostwritten: Blog written as if guest is the author. Conversational: Blog includes dialogue between host and guest.
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleCreateWebinarSession}
                disabled={isCreating || !webinarTopic.trim() || webinarTopic.trim().length < 10}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {isCreating ? 'Creating...' : 'Start Webinar Workflow'}
              </button>
              <button
                onClick={() => setShowWebinarModal(false)}
                disabled={isCreating}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
