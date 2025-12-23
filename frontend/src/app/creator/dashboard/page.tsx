/**
 * Creator Dashboard - Main interface for blog creators
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getRole, clearAuth, getToken } from '@/lib/auth';
import { api } from '@/lib/api';

export default function CreatorDashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [primaryKeyword, setPrimaryKeyword] = useState('');
  const [blogType, setBlogType] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);

  useEffect(() => {
    const userRole = getRole();
    if (!userRole || userRole !== 'creator') {
      router.push('/login');
      return;
    }
    setRole(userRole);
    loadActiveSession();
  }, [router]);

  const loadActiveSession = async () => {
    setIsLoadingSessions(true);
    try {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await api.getActiveSession(token);
      if (response.session) {
        setActiveSession(response.session);
      }
    } catch (err) {
      console.error('Failed to load active session:', err);
    } finally {
      setIsLoadingSessions(false);
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
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <div className="flex items-center mb-4">
            <div className="text-4xl mr-4">✅</div>
            <div>
              <h2 className="text-2xl font-semibold text-green-600">Login Successful!</h2>
              <p className="text-gray-600">You are logged in as Creator</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Session Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Current Session</h3>

            {isLoadingSessions ? (
              <div className="text-gray-600 mb-4">Loading sessions...</div>
            ) : activeSession ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📝</span>
                    <h4 className="font-semibold text-green-900">Active Session Found</h4>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-medium">Keyword:</span> {activeSession.primary_keyword}
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    <span className="font-medium">Current Step:</span> {activeSession.current_step} of 22
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Created:</span> {new Date(activeSession.created_at).toLocaleDateString()}
                  </p>
                  <div className="mt-3 bg-white rounded border border-green-300 overflow-hidden">
                    <div className="h-2 bg-green-600" style={{ width: `${(activeSession.current_step / 22) * 100}%` }}></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/creator/session/${activeSession.session_id}/step/${activeSession.current_step}`)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Resume Session
                  </button>
                  <button
                    onClick={handleStartNewBlog}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    Start New
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-4">No active session</p>
                <button
                  onClick={handleStartNewBlog}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  Start New Blog
                </button>
              </>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h3>
            <ul className="space-y-3 text-gray-600">
              <li>📝 Active Sessions: {activeSession ? 1 : 0}</li>
              <li>⏳ In Progress: {activeSession ? 1 : 0}</li>
              <li>✅ Completed Steps: {activeSession ? activeSession.current_step - 1 : 0}/22</li>
            </ul>
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
    </div>
  );
}
