'use client';

/**
 * Webinar Session Step Execution Page
 * Main page for executing webinar-to-blog workflow steps
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { getToken, getRole } from '@/lib/auth';
import { getWebinarStepComponent, getWebinarStepMetadata, TOTAL_WEBINAR_STEPS } from '@/components/webinar-steps';

export default function WebinarSessionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const [sessionState, setSessionState] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStepNumber, setCurrentStepNumber] = useState(1);

  useEffect(() => {
    // Verify user role before loading session
    const userRole = getRole();
    if (!userRole || userRole !== 'creator') {
      router.push('/login');
      return;
    }
    loadSessionState();
  }, [sessionId]);

  const loadSessionState = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const state = await api.getWebinarSession(sessionId, token);
      setSessionState(state);
      setCurrentStepNumber(state.current_step || 1);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load webinar session:', err);
      setError(err.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseSession = async () => {
    try {
      const token = getToken();
      if (!token) return;

      await api.pauseWebinarSession(sessionId, token);
      router.push('/creator/dashboard');
    } catch (err: any) {
      console.error('Failed to pause session:', err);
      alert('Failed to pause session: ' + err.message);
    }
  };

  const handleStepComplete = async () => {
    // Reload session state after step completion WITHOUT changing currentStepNumber
    // This enables the Next button without auto-navigating to the next step
    try {
      const token = getToken();
      if (!token) return;

      const state = await api.getWebinarSession(sessionId, token);
      setSessionState(state);  // Update session state only
      // Don't update currentStepNumber - let user click Next to advance
    } catch (error) {
      console.error('Failed to reload session state:', error);
    }
  };

  const navigateToStep = (stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= TOTAL_WEBINAR_STEPS) {
      setCurrentStepNumber(stepNumber);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-purple-600 font-medium">Loading webinar session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <div className="text-red-600 text-center">
            <h2 className="text-2xl font-bold mb-2">Error</h2>
            <p className="mb-4">{error}</p>
            <button
              onClick={() => router.push('/creator/dashboard')}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionState) {
    return null;
  }

  const currentStepMetadata = getWebinarStepMetadata(currentStepNumber);
  const progressPercentage = Math.round((currentStepNumber / TOTAL_WEBINAR_STEPS) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-purple-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">WEBINAR</span>
                <h1 className="text-xl font-bold text-gray-900 truncate">
                  {sessionState.webinar_topic}
                </h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>Step {currentStepNumber} of {TOTAL_WEBINAR_STEPS}</span>
                {sessionState.guest_name && (
                  <span className="text-purple-600">Guest: {sessionState.guest_name}</span>
                )}
                <span className="capitalize">{sessionState.content_format || 'ghostwritten'} format</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePauseSession}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Pause & Exit
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
              <span>{currentStepMetadata?.name}</span>
              <span>{progressPercentage}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Step Navigation Pills */}
      <div className="bg-white border-b border-purple-200 px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 max-w-7xl mx-auto">
          {Array.from({ length: TOTAL_WEBINAR_STEPS }, (_, i) => i + 1).map((stepNum) => {
            const stepData = sessionState.steps?.[stepNum.toString()];
            const isComplete = stepData?.status === 'completed';
            const isCurrent = stepNum === currentStepNumber;
            const isClickable = stepNum <= (sessionState.current_step || 1);

            return (
              <button
                key={stepNum}
                onClick={() => isClickable && navigateToStep(stepNum)}
                disabled={!isClickable}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                  ${isCurrent
                    ? 'bg-purple-600 text-white ring-2 ring-purple-400 ring-offset-2'
                    : isComplete
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : isClickable
                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {isComplete ? '✓ ' : ''}Step {stepNum}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {/* Step Content */}
          {getWebinarStepComponent({
            sessionId,
            stepNumber: currentStepNumber,
            initialData: sessionState.steps?.[currentStepNumber.toString()]?.data,
            onStepComplete: handleStepComplete
          })}

          {/* Step Navigation Buttons */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigateToStep(currentStepNumber - 1)}
                disabled={currentStepNumber === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous Step
              </button>

              <div className="text-sm text-gray-600">
                <span className="font-medium">{currentStepMetadata?.owner}</span> Step •
                <span className="ml-1">{currentStepMetadata?.estimatedDuration}</span>
              </div>

              <button
                onClick={() => navigateToStep(currentStepNumber + 1)}
                disabled={currentStepNumber >= (sessionState.current_step || 1) || currentStepNumber === TOTAL_WEBINAR_STEPS}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next Step →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
