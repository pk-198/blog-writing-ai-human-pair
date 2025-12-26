'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, getRole } from '@/lib/auth';
import SimplifiedStepCard from '@/components/creator/SimplifiedStepCard';
import { STEP_METADATA } from '@/components/steps';

interface SessionState {
  session_id: string;
  primary_keyword: string;
  blog_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  current_step: number;
  schema_version?: number;
  steps: Record<string, any>;
}

export default function CreatorSessionViewerPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  // Verify user is authenticated as creator
  useEffect(() => {
    const userRole = getRole();
    if (!userRole || userRole !== 'creator') {
      router.push('/login');
      return;
    }
  }, [router]);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const state = await api.getSessionState(sessionId, token);
      setSessionState(state);
    } catch (err: any) {
      console.error('Error loading session:', err);
      setError(err.message || 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'active':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'expired':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getStepsArray = () => {
    if (!sessionState?.steps) return [];

    const schemaVersion = sessionState.schema_version || 1;
    const isOldSession = schemaVersion < 2;

    return Object.entries(sessionState.steps)
      .map(([stepNumber, stepData]) => {
        const stepNum = parseInt(stepNumber);
        const metadata = STEP_METADATA[stepNum as keyof typeof STEP_METADATA];
        return {
          step_number: stepNum,
          step_name: stepData.step_name || metadata?.name || `Step ${stepNumber}`,
          owner: metadata?.owner || 'Unknown',
          status: stepData.status || 'pending',
          started_at: stepData.started_at,
          completed_at: stepData.completed_at,
          duration_seconds: stepData.duration_seconds,
          data: stepData.data || {},
          skipped: stepData.skipped || false,
          skip_reason: stepData.skip_reason
        };
      })
      .filter(step => {
        // For old sessions (schema v1), hide steps 21 and 22
        if (isOldSession && (step.step_number === 21 || step.step_number === 22)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => a.step_number - b.step_number);
  };

  const downloadBlogExport = async () => {
    try {
      const token = getToken();
      if (!token) return;

      // Find blog export in session data - check schema_version to use correct step
      const schemaVersion = sessionState?.schema_version || 1;
      const exportStepNumber = schemaVersion < 2 ? '22' : '21';  // Old: Step 22, New: Step 21
      const exportStepData = sessionState?.steps?.[exportStepNumber]?.data;

      if (exportStepData?.export_path || exportStepData?.blog_content) {
        const content = exportStepData.blog_content || 'Blog export not available';
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sessionState?.primary_keyword?.replace(/\s+/g, '-')}_blog.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Blog export not available for this session');
      }
    } catch (err: any) {
      console.error('Error downloading blog:', err);
      alert('Failed to download blog export');
    }
  };

  const stepsArray = getStepsArray();
  const completedSteps = stepsArray.filter((s) => s.status === 'completed').length;
  const skippedSteps = stepsArray.filter((s) => s.skipped).length;
  const progress = (completedSteps / 22) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {sessionState?.primary_keyword || 'Loading...'}
                </h1>
                {sessionState && (
                  <span
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border ${getStatusColor(
                      sessionState.status
                    )}`}
                  >
                    {sessionState.status.toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-4">{sessionState?.blog_type}</p>
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div>
                  <span className="font-medium">Session ID:</span> {sessionId}
                </div>
                {sessionState && (
                  <>
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {formatDate(sessionState.created_at)}
                    </div>
                    <div>
                      <span className="font-medium">Last Updated:</span>{' '}
                      {formatDate(sessionState.updated_at)}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/creator/history')}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                Back to History
              </button>
              {sessionState?.status === 'completed' && (
                <button
                  onClick={downloadBlogExport}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download Blog
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      {sessionState && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-700">
                Workflow Progress: {completedSteps} of 22 steps completed
                {skippedSteps > 0 && ` (${skippedSteps} skipped)`}
              </div>
              <div className="text-sm font-bold text-gray-900">
                {Math.round(progress)}%
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading session...</p>
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
              onClick={loadSession}
              className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Workflow Steps */}
        {!isLoading && !error && sessionState && (
          <div>
            {/* Controls */}
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                Workflow Steps
              </h2>
              <button
                onClick={() => setExpandAll(!expandAll)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
              >
                {expandAll ? 'Collapse All' : 'Expand All'}
              </button>
            </div>

            {/* Steps List */}
            <div className="space-y-4">
              {stepsArray.map((step) => (
                <SimplifiedStepCard
                  key={step.step_number}
                  step={step}
                  forceExpanded={expandAll}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
