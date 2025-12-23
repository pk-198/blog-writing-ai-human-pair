/**
 * Step 20: AI Signal Removal
 * AI removes AI-written signals and clichés from content
 * Owner: AI
 */

'use client';

import React, { useState, useEffect } from 'react';
import StepContainer from '../shared/StepContainer';
import AIOutputDisplay from '../shared/AIOutputDisplay';
import SuccessBanner from '../shared/SuccessBanner';
import ErrorBanner from '../shared/ErrorBanner';
import ProgressAnimation from '../shared/ProgressAnimation';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Step20Props {
  sessionId: string;
  initialData?: any;
}

export default function Step20AISignalRemoval({ sessionId, initialData }: Step20Props) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [stepData, setStepData] = useState<any>(initialData || null);
  const [error, setError] = useState<string | null>(null);
  const [showCleanedContent, setShowCleanedContent] = useState(false);

  useEffect(() => {
    // Auto-execute on mount if not already executed
    if (!initialData && !isExecuting && !executionComplete) {
      handleExecute();
    }
  }, []);

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep20AISignalRemoval(sessionId, token);

      if (result.success && result.data) {
        setStepData(result.data);
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to remove AI signals');
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

      await api.skipStep(20, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    // Navigate back to dashboard
    window.location.href = '/creator/dashboard';
  };

  const downloadCleanedContent = () => {
    if (!stepData?.cleaned_content) return;

    const blob = new Blob([stepData.cleaned_content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = stepData.cleaned_file || 'blog_cleaned.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderResults = () => {
    if (!stepData) return null;

    const changesMade = stepData.changes_made || [];
    const warnings = stepData.warnings || [];
    const changeCount = stepData.change_count || changesMade.length;

    return (
      <div className="space-y-6">
        {/* Overview */}
        <div className={`border-2 rounded-lg p-6 ${
          changeCount === 0
            ? 'bg-gradient-to-r from-green-50 to-teal-50 border-green-300'
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">
                {changeCount === 0 ? '✨' : '🔧'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {changeCount === 0 ? 'No AI Signals Found' : 'AI Signals Removed'}
                </h3>
                <p className="text-sm text-gray-600">
                  {changeCount === 0
                    ? 'Content is already human-like'
                    : `${changeCount} improvements made`}
                </p>
              </div>
            </div>
            {stepData.cleaned_content && (
              <button
                onClick={downloadCleanedContent}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Download
              </button>
            )}
          </div>
        </div>

        {/* Changes Made */}
        {changesMade.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Changes Made ({changeCount})
            </h4>
            <div className="space-y-3">
              {changesMade.map((change: any, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-blue-50 rounded border border-blue-200"
                >
                  {typeof change === 'string' ? (
                    <p className="text-sm text-gray-700">{change}</p>
                  ) : (
                    <div>
                      <div className="text-xs font-semibold text-blue-600 uppercase mb-1">
                        {change.type || 'Change'}
                      </div>
                      {change.before && (
                        <div className="mb-2">
                          <div className="text-xs text-gray-600 mb-1">Before:</div>
                          <div className="p-2 bg-red-100 rounded text-sm line-through">
                            {change.before}
                          </div>
                        </div>
                      )}
                      {change.after && (
                        <div>
                          <div className="text-xs text-gray-600 mb-1">After:</div>
                          <div className="p-2 bg-green-100 rounded text-sm">
                            {change.after}
                          </div>
                        </div>
                      )}
                      {change.description && (
                        <p className="mt-2 text-xs text-gray-600">
                          {change.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>⚠️</span>
              <span>Remaining Issues ({warnings.length})</span>
            </h4>
            <div className="space-y-2">
              {warnings.map((warning: string, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-white rounded border border-yellow-300 text-sm text-gray-700"
                >
                  {warning}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-yellow-700">
              💡 Consider manually reviewing and editing these sections
            </p>
          </div>
        )}

        {/* Cleaned Content Preview */}
        {stepData.cleaned_content && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => setShowCleanedContent(!showCleanedContent)}
              className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
            >
              <h4 className="font-semibold text-gray-900">
                View Cleaned Content
              </h4>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${
                  showCleanedContent ? 'transform rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showCleanedContent && (
              <div className="px-6 pb-6 border-t border-gray-200">
                <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {stepData.cleaned_content}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* File Saved Info */}
        {stepData.cleaned_file && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span>💾</span>
              <span>Cleaned version saved as: <code className="font-mono bg-white px-2 py-1 rounded">{stepData.cleaned_file}</code></span>
            </div>
          </div>
        )}

        {/* Summary */}
        {stepData.summary && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✓</span>
              <span className="text-green-900 font-medium">{stepData.summary}</span>
            </div>
          </div>
        )}

        {/* Raw Data (Collapsible) */}
        <AIOutputDisplay title="AI Signal Removal Details" data={stepData} collapsible={true} />
      </div>
    );
  };

  return (
    <StepContainer
      stepNumber={20}
      stepName="AI Signal Removal"
      owner="AI"
      description="AI removes AI-written signals and clichés to make content more human-like"
    >
      {/* Instructions */}
      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-sm text-gray-700 mb-2">
          <strong>AI Task:</strong> Analyze the blog draft to identify and remove common AI
          writing signals such as:
        </p>
        <ul className="text-xs text-gray-600 space-y-1 ml-4">
          <li>• "In the realm of", "in today's digital landscape"</li>
          <li>• "Moreover", "Furthermore", excessive transitional phrases</li>
          <li>• Overly formal language and robotic sentence structures</li>
          <li>• Repetitive phrases and clichés</li>
          <li>• Unnecessary hedging words ("arguably", "essentially")</li>
        </ul>
      </div>

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={20}
          stepName="AI Signal Removal"
          estimatedSeconds={40}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={20}
          stepName="AI Signal Removal"
        />
      )}

      {/* Results */}
      {executionComplete && !isExecuting && stepData && (
        <div className="space-y-6">
          <SuccessBanner
            stepNumber={20}
            stepName="AI Signal Removal"
            message="Humanized content and removed AI detection signals"
          />
          {renderResults()}
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={20}
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
