/**
 * Step 1: Search Intent Analysis
 * AI analyzes SERP results to determine primary search intent
 * Owner: AI
 * Includes unsaved changes detection for editable AI output
 */

'use client';

import React, { useState, useEffect } from 'react';
import StepContainer from '../shared/StepContainer';
import AIOutputDisplay from '../shared/AIOutputDisplay';
import EditableOutput from '../shared/EditableOutput';
import SuccessBanner from '../shared/SuccessBanner';
import ErrorBanner from '../shared/ErrorBanner';
import ProgressAnimation from '../shared/ProgressAnimation';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

interface Step1Props {
  sessionId: string;
  initialData?: any;
}

export default function Step1SearchIntent({ sessionId, initialData }: Step1Props) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [stepData, setStepData] = useState(initialData || null);
  const [error, setError] = useState<string | null>(null);

  // Unsaved changes tracking for editable AI output
  const { hasUnsavedChanges, setHasUnsavedChanges, resetUnsavedChanges } = useUnsavedChanges();

  // Blog selection state
  const [selectedBlogs, setSelectedBlogs] = useState<string[]>(
    initialData?.selected_blog_urls || []
  );
  const [customUrls, setCustomUrls] = useState<string>(
    initialData?.custom_blog_urls?.join('\n') || ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Ref for cleanup of success message timer
  const successTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep1SearchIntent(sessionId, token);

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

      await api.skipStep(1, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    // Navigate back to dashboard
    window.location.href = '/creator/dashboard';
  };

  // Blog selection handlers
  const toggleBlogSelection = (url: string) => {
    setSelectedBlogs(prev =>
      prev.includes(url)
        ? prev.filter(u => u !== url)
        : [...prev, url]
    );
    setSaveSuccess(false); // Reset success message when selection changes
    setError(null); // Clear error when user changes selection
  };

  const getTotalSelected = () => {
    const customUrlList = customUrls
      .trim()
      .split('\n')
      .filter(u => u.trim())
      .map(u => u.trim());
    // Remove duplicates to get accurate count
    const allUrls = [...new Set([...selectedBlogs, ...customUrlList])];
    return allUrls.length;
  };

  const saveBlogSelection = async () => {
    const customUrlList = customUrls
      .trim()
      .split('\n')
      .filter(u => u.trim())
      .map(u => u.trim());

    // Remove duplicates using Set
    const allUrls = [...new Set([...selectedBlogs, ...customUrlList])];

    if (allUrls.length < 3) {
      setError('Please select at least 3 blogs (from SERP results or custom URLs)');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      await api.updateStepData(
        1,
        sessionId,
        {
          selected_blog_urls: selectedBlogs,
          custom_blog_urls: customUrlList,
          total_selected_blogs: allUrls.length
        },
        token
      );

      // Update local state to show saved status
      setStepData({
        ...stepData,
        selected_blog_urls: selectedBlogs,
        custom_blog_urls: customUrlList,
        total_selected_blogs: allUrls.length
      });

      setSaveSuccess(true);

      // Clear success message after 3 seconds with cleanup
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save blog selection');
    } finally {
      setIsSaving(false);
    }
  };

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  return (
    <StepContainer
      stepNumber={1}
      stepName="Search Intent Analysis"
      owner="AI"
      description="AI analyzes SERP results to identify the primary search intent and recommend which direction to pursue for this blog."
    >
      {/* Instructions */}
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
            <li>AI fetches top 10 SERP results for your primary keyword</li>
            <li>Analyzes search intent patterns (informational, commercial, transactional, navigational)</li>
            <li>Provides breakdown of intent percentages</li>
            <li>Recommends which single intent to pursue for optimal ranking</li>
          </ul>
        </div>
      )}

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={1}
          stepName="Search Intent Analysis"
          estimatedSeconds={30}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={1}
          stepName="Search Intent Analysis"
        />
      )}

      {/* Results Display */}
      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-4">
          {/* Success Banner */}
          <SuccessBanner
            stepNumber={1}
            stepName="Search Intent Analysis"
            message="Analyzed search intent from SERP results"
          />

          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Analysis Results
          </h3>

          {/* Primary Intent */}
          {stepData.primary_intent && (
            <AIOutputDisplay
              title="Primary Search Intent"
              data={stepData.primary_intent}
              format="text"
            />
          )}

          {/* Intent Breakdown */}
          {stepData.intent_breakdown && (
            <AIOutputDisplay
              title="Intent Breakdown"
              data={stepData.intent_breakdown}
              format="json"
              collapsible={true}
            />
          )}

          {/* Recommended Direction - Editable */}
          {stepData.recommended_direction && (
            <EditableOutput
              stepNumber={1}
              sessionId={sessionId}
              title="Recommended Direction (Editable)"
              initialData={stepData.recommended_direction}
              dataKey="recommended_direction"
              onSave={(updatedData) => {
                setStepData({ ...stepData, recommended_direction: updatedData });
              }}
              onEditStart={() => setHasUnsavedChanges(true)}
              onSaveSuccess={() => resetUnsavedChanges()}
            />
          )}

          {/* SERP Analysis */}
          {stepData.serp_analysis && (
            <AIOutputDisplay
              title="SERP Analysis (Top 10 Results)"
              data={stepData.serp_analysis}
              format="json"
              collapsible={true}
            />
          )}

          {/* Blog Selection for Content Fetching */}
          {stepData.serp_analysis?.top_results && (
            <div className="mt-6 space-y-4">
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900">
                      📋 Select Blogs for Content Fetching
                    </h3>
                    <p className="text-sm text-gray-700 mt-1">
                      Choose blogs from the SERP results below, or add your own URLs.
                      This content will be used in Step 2 and future steps.
                    </p>
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-300 rounded">
                      <p className="text-xs text-yellow-800">
                        ⚠️ <strong>Note:</strong> Reddit scraping often fails due to blocking. Select enough non-Reddit blogs or add custom URLs to ensure successful content fetching.
                      </p>
                    </div>
                  </div>
                  {saveSuccess && (
                    <div className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-medium">
                      ✓ Saved!
                    </div>
                  )}
                </div>

                {/* SERP Results with Checkboxes */}
                <div className="space-y-2 mb-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Select from Top 10 SERP Results:
                  </h4>
                  {stepData.serp_analysis.top_results.map((result: any, idx: number) => (
                    <label
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-white border-2 border-gray-200 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBlogs.includes(result.url)}
                        onChange={() => toggleBlogSelection(result.url)}
                        className="mt-1 w-4 h-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                            #{result.rank}
                          </span>
                          <span className="font-medium text-gray-900">{result.title}</span>
                        </div>
                        <div className="text-xs text-blue-600 mt-1 break-all">{result.url}</div>
                        {result.content_preview && (
                          <div
                            className="text-xs text-gray-500 mt-1 overflow-hidden"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical'
                            }}
                          >
                            {result.content_preview}
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {/* Custom URLs Input */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Add Custom URLs (one per line):
                  </label>
                  <textarea
                    value={customUrls}
                    onChange={(e) => {
                      setCustomUrls(e.target.value);
                      setSaveSuccess(false);
                      setError(null); // Clear error when user changes custom URLs
                    }}
                    placeholder={`https://example.com/article-1
https://example.com/article-2
https://research-site.com/paper`}
                    rows={4}
                    className="w-full border-2 border-gray-300 rounded p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Add URLs from your own research that aren't in the top 10 SERP results
                  </p>
                </div>

                {/* Validation & Save Button */}
                <div className="flex items-center justify-between pt-4 border-t border-blue-200">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">
                      Total Selected: <span className="text-blue-600 font-bold">{getTotalSelected()}</span>
                    </span>
                    {getTotalSelected() < 3 && (
                      <span className="text-xs text-orange-600 font-medium mt-1">
                        ⚠️ Minimum 3 blogs required
                      </span>
                    )}
                    {getTotalSelected() > 10 && (
                      <span className="text-xs text-yellow-600 font-medium mt-1">
                        ⚡ Large selection may increase API costs
                      </span>
                    )}
                  </div>
                  <button
                    onClick={saveBlogSelection}
                    disabled={getTotalSelected() < 3 || isSaving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save Blog Selection'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {stepData.summary && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Summary</h4>
              <p className="text-green-800">{stepData.summary}</p>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={1}
        isExecuting={isExecuting}
        canExecute={!executionComplete}
        canSkip={false} // Step 1 cannot be skipped
        onExecute={handleExecute}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </StepContainer>
  );
}
