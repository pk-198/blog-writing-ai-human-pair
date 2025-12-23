/**
 * Step 2: Competitor Content Fetch
 * AI fetches top 5 competitor pages using Tavily API
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

interface Step2Props {
  sessionId: string;
  initialData?: any;
}

export default function Step2CompetitorFetch({ sessionId, initialData }: Step2Props) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [stepData, setStepData] = useState(initialData || null);
  const [error, setError] = useState<string | null>(null);

  // Manual competitor addition state
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [manualSuccess, setManualSuccess] = useState(false);

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep2CompetitorFetch(sessionId, token);

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

      await api.skipStep(2, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  const handleRedo = async () => {
    // Reset state to allow re-execution
    setExecutionComplete(false);
    setStepData(null);
    setError(null);
    // Automatically trigger execution
    await handleExecute();
  };

  const handleAddManual = async () => {
    // Validate inputs
    if (!manualUrl.trim() || !manualTitle.trim() || !manualContent.trim()) {
      setError('Please fill in all fields (URL, Title, Content)');
      return;
    }

    setIsAddingManual(true);
    setError(null);
    setManualSuccess(false);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.addManualCompetitorContent(
        sessionId,
        [
          {
            url: manualUrl.trim(),
            title: manualTitle.trim(),
            content: manualContent.trim()
          }
        ],
        token
      );

      if (result.success) {
        // Update step data with new merged competitors
        setStepData(result.data);
        setManualSuccess(true);

        // Clear form
        setManualUrl('');
        setManualTitle('');
        setManualContent('');
        setShowManualForm(false);

        // Clear success message after 3 seconds
        setTimeout(() => setManualSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while adding manual content');
    } finally {
      setIsAddingManual(false);
    }
  };

  return (
    <StepContainer
      stepNumber={2}
      stepName="Competitor Content Fetch"
      owner="AI"
      description="AI fetches the top 5 competitor pages for your keyword using Tavily Search API to analyze their content structure and approach."
    >
      {/* Instructions */}
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
            <li>AI fetches content from top 5 ranking pages for your keyword</li>
            <li>Extracts full text content, headings, and page structure</li>
            <li>Calculates word count and domain authority indicators</li>
            <li>Provides comprehensive data for competitor analysis in Step 3</li>
          </ul>
        </div>
      )}

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={2}
          stepName="Competitor Content Fetch"
          estimatedSeconds={45}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={2}
          stepName="Competitor Content Fetch"
        />
      )}

      {/* Results Display */}
      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-4">
          {/* Success Banner */}
          <SuccessBanner
            stepNumber={2}
            stepName="Competitor Content Fetch"
            message={
              stepData.total_requested
                ? `Fetched ${stepData.successful_fetches || 0} of ${stepData.total_requested} user-selected blogs`
                : `Fetched ${stepData.competitors?.length || 0} competitor pages with full content`
            }
          />

          {/* Failed URLs Warning (if any) */}
          {stepData.failed_urls && stepData.failed_urls.length > 0 && (
            <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 mb-2">
                    {stepData.failed_urls.length} URL(s) Failed to Fetch
                  </h4>
                  <p className="text-sm text-yellow-800 mb-3">
                    These URLs could not be fetched. The remaining blogs were processed successfully.
                  </p>
                  <ul className="space-y-2">
                    {stepData.failed_urls.map((failed: any, idx: number) => (
                      <li key={idx} className="bg-white border border-yellow-200 rounded p-2">
                        <div className="font-mono text-xs text-gray-800 break-all mb-1">
                          {failed.url}
                        </div>
                        <div className="text-xs text-red-600">
                          Error: {failed.reason}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {stepData.total_requested ? (
              <span>
                Successfully Fetched <span className="text-blue-600">{stepData.successful_fetches || 0}</span>
                {' '}of{' '}
                <span className="text-gray-600">{stepData.total_requested}</span> User-Selected Blogs
              </span>
            ) : (
              <span>Fetched {stepData.competitors?.length || 0} Competitor Pages</span>
            )}
          </h3>

          {/* Competitor Cards */}
          {stepData.competitors && stepData.competitors.map((competitor: any, index: number) => (
            <div key={index} className="border-2 border-blue-200 rounded-lg p-4 bg-gradient-to-br from-white to-blue-50">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                      Rank #{competitor.rank}
                    </span>
                    {competitor.source === 'user_selected' && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded flex items-center gap-1">
                        <span>👤</span> User Selected
                      </span>
                    )}
                    {competitor.source === 'manual' && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded flex items-center gap-1">
                        <span>✍️</span> Manually Added
                      </span>
                    )}
                    <span className="text-sm text-gray-600">{competitor.domain}</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-1">{competitor.title}</h4>
                  <a
                    href={competitor.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {competitor.url}
                  </a>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Word Count</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {competitor.word_count?.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Headings Preview */}
              {competitor.headings && (
                <div className="mb-3">
                  <button
                    onClick={() => {
                      const detail = document.getElementById(`competitor-${index}-detail`);
                      if (detail) {
                        detail.classList.toggle('hidden');
                      }
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View Headings Structure →
                  </button>
                  <div id={`competitor-${index}-detail`} className="hidden mt-2">
                    <AIOutputDisplay
                      title="Heading Structure"
                      data={competitor.headings}
                      format="json"
                      collapsible={true}
                    />
                  </div>
                </div>
              )}

              {/* Content Preview */}
              <div className="text-sm text-gray-700 line-clamp-3">
                {competitor.content?.substring(0, 200)}...
              </div>
            </div>
          ))}

          {/* Manual Competitor Addition Section */}
          <div className="mt-8 space-y-4">
            <div className="border-2 border-purple-200 rounded-lg p-6 bg-gradient-to-br from-purple-50 to-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                    ✍️ Add Manual Competitor Content
                  </h3>
                  <p className="text-sm text-gray-700 mt-1">
                    Add content that failed to scrape or relevant paragraphs from other blogs
                  </p>
                </div>
                {manualSuccess && (
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-medium">
                    ✓ Added!
                  </div>
                )}
              </div>

              {!showManualForm ? (
                <button
                  onClick={() => setShowManualForm(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  + Add Manual Content
                </button>
              ) : (
                <div className="space-y-4">
                  {/* URL Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder="https://example.com/article"
                      className="w-full border-2 border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Title Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Article title or description"
                      className="w-full border-2 border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Content Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Content <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      placeholder="Paste the relevant content here (full article or specific paragraphs)"
                      rows={8}
                      className="w-full border-2 border-gray-300 rounded-lg p-3 font-mono text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Paste full content from failed URLs or specific relevant paragraphs from other sources
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleAddManual}
                      disabled={isAddingManual}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isAddingManual ? 'Adding...' : 'Add to Competitors'}
                    </button>
                    <button
                      onClick={() => {
                        setShowManualForm(false);
                        setManualUrl('');
                        setManualTitle('');
                        setManualContent('');
                        setError(null);
                      }}
                      disabled={isAddingManual}
                      className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Manual Additions Count */}
            {stepData.manual_additions && stepData.manual_additions > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm text-purple-800">
                  ✅ <strong>{stepData.manual_additions}</strong> manual competitor(s) added to this session
                </p>
              </div>
            )}
          </div>

          {/* Summary */}
          {stepData.summary && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Summary</h4>
              <p className="text-green-800">{stepData.summary}</p>
            </div>
          )}

          {/* Full Data (Collapsible) */}
          <AIOutputDisplay
            title="Complete Competitor Data (JSON)"
            data={stepData}
            format="json"
            collapsible={true}
          />
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={2}
        isExecuting={isExecuting}
        canExecute={!executionComplete}
        canSkip={false}
        onExecute={handleExecute}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
        isAIStep={true}
        onRedo={handleRedo}
      />
    </StepContainer>
  );
}
