/**
 * Webinar Step 2: Competitor Content Fetch
 *
 * TWO-PHASE WORKFLOW (2025-01-02 Update):
 *
 * Phase 1: Search for Competitors (AI)
 * - Searches Google/Bing for competitor webinar/podcast blogs
 * - Returns search results with titles, URLs, and 300-char snippets
 * - Shows selection UI to user
 *
 * Phase 2: Fetch Full Content (AI + Human Selection)
 * - User selects which competitors to analyze (top 3 auto-selected)
 * - Fetches FULL blog content (5000+ chars) using Tavily extract API
 * - Replaces snippets with complete article text for Step 3 analysis
 *
 * WHY TWO PHASES: Step 3 needs full content to analyze structure and patterns.
 * Snippets (300 chars) are insufficient for deep competitor analysis.
 *
 * Owner: AI (search) + Creator (selection) + AI (fetch)
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import SuccessBanner from '../shared/SuccessBanner';
import ErrorBanner from '../shared/ErrorBanner';
import ProgressAnimation from '../shared/ProgressAnimation';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface WebinarStep2Props {
  sessionId: string;
  initialData?: any;
  onStepComplete?: () => Promise<void>;
}

export default function WebinarStep2CompetitorFetch({ sessionId, initialData, onStepComplete }: WebinarStep2Props) {
  // Determine if Phase 2 is complete (full content fetched, not just search results)
  // Check for 'content' or 'word_count' fields which are only added in Phase 2
  const hasFetchedContent = initialData?.competitors?.some((c: any) => c.content || c.word_count);

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(hasFetchedContent || false);
  const [stepData, setStepData] = useState(initialData || null);
  const [error, setError] = useState<string | null>(null);

  // Phase 2 selection state
  const [selectedUrls, setSelectedUrls] = useState<string[]>([]);
  const [isFetching, setIsFetching] = useState(false);  // Phase 2 fetch in progress

  // Phase 1: Search for competitors
  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

      const result = await api.executeWebinarStep2(sessionId, token);

      if (result.success) {
        setStepData(result.data);
        // After search, show selection UI (not complete yet)
        setExecutionComplete(false);
        // Auto-select top 3 results
        const topUrls = result.data.competitors?.slice(0, 3).map((c: any) => c.url) || [];
        setSelectedUrls(topUrls);
      } else {
        setError(result.error || 'Step execution failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Phase 2: Fetch Full Content for Selected Competitors
   *
   * ADDED: 2025-01-02 to replace snippet-only analysis with full content analysis.
   *
   * This handler:
   * 1. Validates at least one competitor is selected
   * 2. Calls backend endpoint to fetch full blog content via Tavily extract API
   * 3. Updates step data with full content (5000+ chars per competitor)
   * 4. Marks step as complete and triggers onStepComplete callback
   *
   * CRITICAL: This must complete before Step 3 runs, otherwise Step 3 will fail
   * validation check for Phase 2 completion.
   */
  const handleFetchSelected = async () => {
    if (selectedUrls.length === 0) {
      setError('Please select at least one competitor to fetch');
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

      // Call backend Phase 2 endpoint to fetch full blog content
      // This replaces 300-char snippets with complete articles (5000+ chars each)
      const result = await api.fetchSelectedWebinarCompetitors(sessionId, selectedUrls, token);

      if (result.success) {
        setStepData(result.data);  // Updated competitors with 'content' and 'word_count' fields
        setExecutionComplete(true);  // Mark Phase 2 complete

        // Trigger parent component to refresh session state
        if (onStepComplete) {
          await onStepComplete();
        }
      } else {
        setError(result.error || 'Failed to fetch selected competitors');
      }

    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsFetching(false);
    }
  };

  // Toggle competitor selection
  const toggleSelection = (url: string) => {
    setSelectedUrls(prev =>
      prev.includes(url)
        ? prev.filter(u => u !== url)
        : [...prev, url]
    );
  };

  const handleSkip = async () => {
    const reason = prompt('Why are you skipping this step?');
    if (!reason) return;

    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

      await api.skipWebinarStep(2, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  /**
   * Save and Pause Handler with Fetch Guard
   *
   * SAFETY (2025-01-02): Prevents pausing during Phase 2 content fetch.
   *
   * WHY: If user pauses mid-fetch:
   * - Some competitors may have full content, others only snippets
   * - Session state becomes inconsistent
   * - Step 3 validation may fail or produce invalid results
   *
   * Better UX: Force user to wait for fetch completion (usually 10-30 seconds)
   * before allowing pause. This ensures clean session state.
   */
  const handleSaveAndPause = async () => {
    if (isFetching) {
      alert('Please wait for competitor fetch to complete before pausing.');
      return;
    }
    window.location.href = '/creator/dashboard';
  };

  return (
    <StepContainer
      stepNumber={2}
      stepName="Competitor Content Fetch"
      owner="AI"
      description="AI fetches competitor webinar/podcast blogs for topic analysis"
    >
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-purple-800 space-y-1 text-sm">
            <li>AI searches for competitor webinar/podcast blogs on similar topics</li>
            <li>Fetches full content and structure from top results</li>
            <li>Extracts key patterns for analysis in Step 3</li>
          </ul>
        </div>
      )}

      {isExecuting && (
        <ProgressAnimation stepNumber={2} stepName="Competitor Content Fetch" estimatedSeconds={40} />
      )}

      {error && (
        <ErrorBanner error={error} onRetry={handleExecute} stepNumber={2} stepName="Competitor Content Fetch" />
      )}

      {/* Phase 2: Selection UI (after search, before fetch) */}
      {stepData && !executionComplete && !isExecuting && !isFetching && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-purple-900 mb-2">Select Competitors to Analyze</h3>
            <p className="text-sm text-purple-800">
              Choose which competitor blogs to fetch and analyze. We've pre-selected the top 3 for you.
            </p>
          </div>

          <div className="bg-white border border-purple-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-gray-900">
                Search Results ({stepData.competitors?.length || 0})
              </h4>
              <div className="text-sm text-gray-600">
                {selectedUrls.length} selected
              </div>
            </div>

            {stepData.competitors && stepData.competitors.length > 0 ? (
              <div className="space-y-2 mb-6">
                {stepData.competitors.map((comp: any, idx: number) => (
                  <label
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-white border-2 border-gray-200 rounded hover:bg-purple-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedUrls.includes(comp.url)}
                      onChange={() => toggleSelection(comp.url)}
                      className="mt-1 w-4 h-4 text-purple-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">
                          #{comp.rank}
                        </span>
                        <h5 className="font-medium text-gray-900">{comp.title}</h5>
                      </div>
                      <a
                        href={comp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline block mb-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {comp.url}
                      </a>
                      {comp.snippet && (
                        <p className="text-xs text-gray-600 line-clamp-2">{comp.snippet}</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No competitors found</p>
            )}

            <button
              onClick={handleFetchSelected}
              disabled={selectedUrls.length === 0}
              className="w-full bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Fetch Selected Competitors ({selectedUrls.length})
            </button>
          </div>
        </div>
      )}

      {/* Phase 3: Fetching progress */}
      {isFetching && (
        <ProgressAnimation stepNumber={2} stepName="Fetching Competitor Content" estimatedSeconds={30} />
      )}

      {/* Phase 4: Final results */}
      {executionComplete && stepData && !isExecuting && !isFetching && (
        <div className="space-y-4">
          <SuccessBanner
            stepNumber={2}
            stepName="Competitor Content Fetch"
            message={`Selected ${stepData.selected_count || selectedUrls.length} competitor pages for analysis`}
          />

          <div className="bg-white border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">
              Selected Competitors ({stepData.selected_count || selectedUrls.length})
            </h3>
            {stepData.total_words && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">
                  <strong>Total Content:</strong> {stepData.total_words.toLocaleString()} words fetched from {stepData.selected_count} blogs
                </p>
              </div>
            )}
            {stepData.competitors && stepData.competitors.length > 0 ? (
              <div className="space-y-3">
                {stepData.competitors
                  .filter((comp: any) => comp.selected || selectedUrls.includes(comp.url))
                  .map((comp: any, idx: number) => (
                    <div key={idx} className="border border-purple-200 rounded p-3 bg-purple-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-purple-600 bg-purple-200 px-2 py-0.5 rounded">
                              #{comp.rank}
                            </span>
                            <h4 className="font-medium text-gray-900">{comp.title}</h4>
                            {comp.word_count && (
                              <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                {comp.word_count.toLocaleString()} words
                              </span>
                            )}
                          </div>
                          <a
                            href={comp.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {comp.url}
                          </a>
                        </div>
                        <span className="text-green-600 text-sm">
                          {comp.fetch_status === 'success' ? '✓ Fetched' : '✓ Selected'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-600">No competitors selected</p>
            )}
          </div>
        </div>
      )}

      <StepNavigation
        currentStep={2}
        isExecuting={isExecuting}
        canExecute={!executionComplete && !isExecuting}
        canSkip={!isExecuting}
        onExecute={handleExecute}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
        sessionId={sessionId}
        hideNavigation={true}
      />
    </StepContainer>
  );
}
