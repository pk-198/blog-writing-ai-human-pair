/**
 * Session Workflow Page - Displays complete workflow with all 22 steps and plagiarism scores
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getRole, clearAuth, getToken } from '@/lib/auth';
import { api } from '@/lib/api';
import WorkflowStepCard from '@/components/reviewer/WorkflowStepCard';

interface SessionData {
  session_id: string;
  primary_keyword: string;
  blog_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
  current_step: number;
}

interface PlagiarismSummary {
  overall_score: number;
  overall_level: string;
  overall_color: string;
  steps_with_plagiarism: number[];
  total_matches: number;
}

interface WorkflowData {
  session: SessionData;
  steps: { [key: string]: any };
  plagiarism_summary: PlagiarismSummary | null;
  audit_log: any[];
}

export default function SessionWorkflowPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [role, setRole] = useState<string | null>(null);
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    const userRole = getRole();
    if (!userRole || userRole !== 'reviewer') {
      router.push('/login');
      return;
    }
    setRole(userRole);
    if (sessionId) {
      loadWorkflow();
    }
  }, [router, sessionId]);

  const loadWorkflow = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const data = await api.getSessionWorkflow(sessionId, true, token);
      setWorkflowData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      await api.downloadBlogFromReviewer(sessionId, token);
    } catch (err: any) {
      alert('Failed to download blog: ' + err.message);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  const getPlagiarismEmoji = (color: string) => {
    switch (color) {
      case 'green':
        return '🟢';
      case 'yellow':
        return '🟡';
      case 'orange':
        return '🟠';
      case 'red':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/reviewer/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <div className="border-l border-gray-300 pl-4">
                <h1 className="text-xl font-bold text-gray-900">Workflow Review</h1>
                {workflowData && (
                  <p className="text-sm text-gray-600">{workflowData.session.primary_keyword}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <div className="text-gray-600">Loading workflow data...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="text-red-800 font-semibold mb-2">Error</div>
            <div className="text-red-700 mb-4">{error}</div>
            <button
              onClick={loadWorkflow}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && workflowData && (
          <div className="space-y-6">
            {/* Session Info Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    {workflowData.session.primary_keyword}
                  </h2>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>
                      <span className="font-semibold">Session ID:</span> {workflowData.session.session_id}
                    </div>
                    <div>
                      <span className="font-semibold">Status:</span>{' '}
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        workflowData.session.status === 'completed' ? 'bg-green-100 text-green-800' :
                        workflowData.session.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {workflowData.session.status.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold">Created:</span> {formatDate(workflowData.session.created_at)}
                    </div>
                    <div>
                      <span className="font-semibold">Last Updated:</span> {formatDate(workflowData.session.updated_at)}
                    </div>
                    <div>
                      <span className="font-semibold">Current Step:</span> {workflowData.session.current_step} / 22
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Blog Type</h3>
                  <p className="text-sm text-gray-700 mb-4">{workflowData.session.blog_type}</p>

                  <button
                    onClick={handleDownload}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                  >
                    📥 Download Blog Export
                  </button>
                </div>
              </div>
            </div>

            {/* Plagiarism Summary Card */}
            {workflowData.plagiarism_summary && (
              <div className={`rounded-lg shadow p-6 border-2 ${
                workflowData.plagiarism_summary.overall_color === 'green' ? 'bg-green-50 border-green-300' :
                workflowData.plagiarism_summary.overall_color === 'yellow' ? 'bg-yellow-50 border-yellow-300' :
                workflowData.plagiarism_summary.overall_color === 'orange' ? 'bg-orange-50 border-orange-300' :
                'bg-red-50 border-red-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{getPlagiarismEmoji(workflowData.plagiarism_summary.overall_color)}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Overall Plagiarism Score: {Math.round(workflowData.plagiarism_summary.overall_score * 100)}%
                      </h3>
                      <p className="text-sm text-gray-700">
                        Level: <span className="font-semibold">{workflowData.plagiarism_summary.overall_level}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {workflowData.plagiarism_summary.steps_with_plagiarism.length}
                    </div>
                    <div className="text-sm text-gray-600">
                      steps with plagiarism
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {workflowData.plagiarism_summary.total_matches} total matches
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Workflow Steps (1-22)</h3>
                <button
                  onClick={() => setExpandAll(!expandAll)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                >
                  {expandAll ? 'Collapse All' : 'Expand All'}
                </button>
              </div>
            </div>

            {/* All 22 Steps */}
            <div className="space-y-4">
              {Array.from({ length: 22 }, (_, i) => i + 1).map((stepNum) => {
                const stepKey = String(stepNum);
                const stepData = workflowData.steps[stepKey];

                if (!stepData) return null;

                return (
                  <WorkflowStepCard
                    key={stepNum}
                    step={stepData}
                  />
                );
              })}
            </div>

            {/* Audit Log Section */}
            {workflowData.audit_log && workflowData.audit_log.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Audit Log</h3>
                <div className="space-y-3">
                  {workflowData.audit_log.map((entry, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              Step {entry.step_number}: {entry.step_name}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              entry.owner === 'AI' ? 'bg-blue-100 text-blue-800' :
                              entry.owner === 'Human' ? 'bg-green-100 text-green-800' :
                              'bg-purple-100 text-purple-800'
                            }`}>
                              {entry.owner}
                            </span>
                            {entry.skipped && (
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800">
                                SKIPPED
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-700">{entry.summary}</div>
                          {entry.human_action && (
                            <div className="text-sm text-green-700 mt-1">
                              <span className="font-semibold">Human:</span> {entry.human_action}
                            </div>
                          )}
                          {entry.skip_reason && (
                            <div className="text-sm text-yellow-700 mt-1">
                              <span className="font-semibold">Reason:</span> {entry.skip_reason}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-xs text-gray-500 ml-4">
                          <div>{formatDate(entry.timestamp)}</div>
                          {entry.duration_minutes > 0 && (
                            <div className="mt-1">{entry.duration_minutes}m</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
