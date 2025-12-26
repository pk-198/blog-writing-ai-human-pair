/**
 * Step 21: Export & Archive
 * AI exports final blog, saves to plagiarism database, and marks session as completed
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

interface Step21Props {
  sessionId: string;
  initialData?: any;
}

export default function Step21ExportArchive({ sessionId, initialData }: Step21Props) {
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

      const result = await api.executeStep21ExportArchive(sessionId, token);

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

      await api.skipStep(21, { session_id: sessionId, reason }, token);
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
      stepNumber={21}
      stepName="Export & Archive"
      owner="AI"
      description="AI exports the completed blog to markdown file, saves user inputs to plagiarism database, and marks session as completed."
    >
      {/* Instructions */}
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-purple-800 space-y-1 text-sm">
            <li>AI exports the final blog draft to a markdown file</li>
            <li>Saves user inputs to plagiarism database for future reference</li>
            <li><strong>Marks the session as COMPLETED</strong> (workflow ends here)</li>
            <li>Step 22 (Final Review Checklist) remains available as reference</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-purple-200">
            <p className="text-xs text-purple-700">
              <strong>Note:</strong> Blog index (past_blogs/blog_index.txt) was already updated in Step 7 when the outline was created.
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={21}
          stepName="Export & Archive"
          estimatedSeconds={35}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={21}
          stepName="Export & Archive"
        />
      )}

      {/* Results Display */}
      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-6">
          {/* Success Banner */}
          <SuccessBanner
            stepNumber={21}
            stepName="Export & Archive"
            message="Blog exported and session completed successfully"
          />

          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="text-5xl">🎉</div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">
                  Blog Creation Complete!
                </h3>
                <p className="text-gray-700">
                  Your blog has been successfully exported and the session has been marked as completed.
                </p>
              </div>
            </div>
          </div>

          {/* Export Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Export Details</h4>

            <div className="space-y-3">
              {/* Exported File */}
              {(stepData.export_file || stepData.exported_file) && (
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl">📄</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">Exported File</div>
                    <div className="text-sm text-gray-700 font-mono break-all">
                      {stepData.export_file || stepData.exported_file}
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
                    Session marked as completed. Step 22 available as reference checklist.
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

              {/* Title */}
              {stepData.title && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl">✏️</div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">Blog Title</div>
                    <div className="text-sm text-gray-700">
                      {stepData.title}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">What's Next?</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span>→</span>
                <span><strong>Step 22:</strong> Use the Final Review Checklist as reference</span>
              </li>
              <li className="flex items-start gap-2">
                <span>→</span>
                <span>Download the markdown file and make any final edits</span>
              </li>
              <li className="flex items-start gap-2">
                <span>→</span>
                <span><strong>IMPORTANT:</strong> Create 2-3 infographics based on Step 15 plan</span>
              </li>
              <li className="flex items-start gap-2">
                <span>→</span>
                <span>Import the blog into your CMS (WordPress, Ghost, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span>→</span>
                <span>Schedule publication and promotion</span>
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

            {/* Navigation to Step 22 */}
            <button
              onClick={() => window.location.href = `/creator/session/${sessionId}/step/22`}
              className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-all font-semibold text-lg shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span className="text-2xl">📋</span>
              View Final Review Checklist (Step 22)
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
        currentStep={21}
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
