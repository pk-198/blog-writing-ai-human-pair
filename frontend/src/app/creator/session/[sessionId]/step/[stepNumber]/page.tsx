/**
 * Step Page - Dynamic step viewer for 22-step workflow
 * Routes to appropriate step component based on step number
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getRole, getToken, clearAuth } from '@/lib/auth';
import { getStepComponent } from '@/components/steps';
import { api } from '@/lib/api';

export default function StepPage() {
  const router = useRouter();
  const params = useParams();
  const [role, setRole] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sessionId = params.sessionId as string;
  const stepNumber = parseInt(params.stepNumber as string);

  useEffect(() => {
    const userRole = getRole();
    if (!userRole || userRole !== 'creator') {
      router.push('/login');
      return;
    }
    setRole(userRole);

    // Load session state to get step data
    loadSessionState();
  }, [router, sessionId]);

  const loadSessionState = async () => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const state = await api.getSessionState(sessionId, token);
      setSessionState(state);
    } catch (err: any) {
      setError(err.message || 'Failed to load session state');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  if (!role || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading step...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Error</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Error Loading Session</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => router.push('/creator/dashboard')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Validate step number
  if (stepNumber < 1 || stepNumber > 22 || isNaN(stepNumber)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Invalid Step</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-2">Invalid Step Number</h2>
            <p className="text-yellow-700 mb-4">
              Step number must be between 1 and 22. You requested step {stepNumber}.
            </p>
            <button
              onClick={() => router.push('/creator/dashboard')}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Get step data from session state
  const stepData = sessionState?.steps?.[stepNumber.toString()]?.data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/creator/dashboard')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="Back to Dashboard"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Blog Creation Workflow
              </h1>
              <p className="text-sm text-gray-600">
                Session: {sessionId.slice(0, 8)}... | Keyword: {sessionState?.primary_keyword}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content - Step Component */}
      <main className="py-6">
        {getStepComponent({
          sessionId,
          stepNumber,
          initialData: stepData,
          schemaVersion: sessionState?.schema_version
        })}
      </main>
    </div>
  );
}
