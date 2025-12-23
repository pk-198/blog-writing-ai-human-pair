/**
 * Step 22: Export & Archive
 * AI exports final blog and archives session
 * Owner: AI
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import AIOutputDisplay from '../shared/AIOutputDisplay';
import SuccessBanner from '../shared/SuccessBanner';
import ErrorBanner from '../shared/ErrorBanner';
import ProgressAnimation from '../shared/ProgressAnimation';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Step22Props {
  sessionId: string;
  initialData?: any;
}

export default function Step22ExportArchive({ sessionId, initialData }: Step22Props) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [stepData, setStepData] = useState(initialData || null);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep22ExportArchive(sessionId, token);

      if (result.success) {
        setStepData(result.data);
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Step execution failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSkip = async () => {
    const reason = prompt('Why are you skipping this step?');
    if (!reason) return;

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      await api.skipStep(22, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  const handleBackToDashboard = () => {
    window.location.href = '/creator/dashboard';
  };

  const handleDownloadBlog = async () => {
    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      await api.downloadBlog(sessionId, token);
    } catch (err: any) {
      setError(err.message || 'Failed to download blog');
    }
  };

  return (
    <StepContainer
      stepNumber={22}
      stepName="Export & Archive"
      owner="AI"
      description="Final step: AI exports the completed blog to markdown file, updates the blog index, and archives the session for future reference."
    >
      {/* Instructions */}
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
            <li>AI exports the final blog draft to a markdown file</li>
            <li>Marks the session as completed and archives the state</li>
            <li>Generates export summary with file paths and metadata</li>
            <li>Provides download button for the exported markdown file</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> Blog index (past_blogs/blog_index.txt) was already updated in Step 7 when the outline was created.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={22}
          stepName="Export & Archive"
          estimatedSeconds={35}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={22}
          stepName="Export & Archive"
        />
      )}

      {/* Results Display */}
      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-6">
          {/* Success Banner */}
          <SuccessBanner
            stepNumber={22}
            stepName="Export & Archive"
            message="Blog exported and session archived successfully"
          />

          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl">🎉</div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  Blog Creation Complete!
                </h3>
                <p className="text-gray-700">
                  Your blog has been successfully exported and the session has been archived.
                </p>
              </div>
            </div>
          </div>

          {/* Export Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Export Details</h4>

            <div className="space-y-3">
              {/* Exported File */}
              {stepData.exported_file && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl">📄</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">Exported File</div>
                    <div className="text-sm text-gray-700 font-mono break-all">
                      {stepData.exported_file}
                    </div>
                  </div>
                </div>
              )}

              {/* Session Status */}
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <div className="text-2xl">✅</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">Session Completed</div>
                  <div className="text-sm text-gray-700">
                    Session marked as completed and archived
                  </div>
                </div>
              </div>

              {/* Word Count */}
              {stepData.word_count && (
                <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl">📝</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">Word Count</div>
                    <div className="text-sm text-gray-700">
                      {stepData.word_count.toLocaleString()} words
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Session Summary */}
          {stepData.session_summary && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Session Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {stepData.session_summary.keyword && (
                  <div>
                    <div className="text-gray-600">Primary Keyword</div>
                    <div className="font-medium text-gray-900">{stepData.session_summary.keyword}</div>
                  </div>
                )}
                {stepData.session_summary.word_count && (
                  <div>
                    <div className="text-gray-600">Word Count</div>
                    <div className="font-medium text-gray-900">{stepData.session_summary.word_count.toLocaleString()}</div>
                  </div>
                )}
                {stepData.session_summary.steps_completed && (
                  <div>
                    <div className="text-gray-600">Steps Completed</div>
                    <div className="font-medium text-gray-900">{stepData.session_summary.steps_completed}/22</div>
                  </div>
                )}
                {stepData.session_summary.created_at && (
                  <div>
                    <div className="text-gray-600">Created</div>
                    <div className="font-medium text-gray-900">
                      {new Date(stepData.session_summary.created_at).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">What's Next?</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span>→</span>
                <span>Review the exported markdown file and make any final edits</span>
              </li>
              <li className="flex items-start gap-2">
                <span>→</span>
                <span>Import the blog into your CMS (WordPress, Ghost, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span>→</span>
                <span>Add images, infographics, and other visual elements</span>
              </li>
              <li className="flex items-start gap-2">
                <span>→</span>
                <span>Schedule publication and promotion</span>
              </li>
              <li className="flex items-start gap-2">
                <span>→</span>
                <span>Monitor SEO performance and update as needed</span>
              </li>
            </ul>
          </div>

          {/* Summary */}
          {stepData.summary && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Summary</h4>
              <p className="text-green-800">{stepData.summary}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            {/* Download Button - Primary Action */}
            <button
              onClick={handleDownloadBlog}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span className="text-2xl">📥</span>
              Download Blog File (.md)
            </button>

            {/* Navigation Buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleBackToDashboard}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => window.location.href = '/creator/dashboard'}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Start New Blog
              </button>
            </div>
          </div>

          {/* Full Data */}
          <AIOutputDisplay
            title="Complete Export Data (JSON)"
            data={stepData}
            format="json"
            collapsible={true}
          />
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={22}
        isExecuting={isExecuting}
        canExecute={!executionComplete}
        canSkip={false}
        onExecute={handleExecute}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
      />
    </StepContainer>
  );
}
