/**
 * Step 17: Blog Draft Generation
 * AI writes complete 2000-3000 word blog draft
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
import PromptDisplay from '../shared/PromptDisplay';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Step17Props {
  sessionId: string;
  initialData?: any;
}

export default function Step17BlogDraft({ sessionId, initialData }: Step17Props) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [stepData, setStepData] = useState(initialData || null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'rendered' | 'markdown'>('rendered');

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep17BlogDraft(sessionId, token);

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

      await api.skipStep(17, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  const handleCopyToClipboard = () => {
    if (stepData?.blog_draft) {
      navigator.clipboard.writeText(stepData.blog_draft);
      alert('Blog draft copied to clipboard!');
    }
  };

  const handleDownload = () => {
    if (stepData?.blog_draft) {
      const blob = new Blob([stepData.blog_draft], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blog-draft-${sessionId}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <StepContainer
      stepNumber={17}
      stepName="Blog Draft Generation"
      owner="AI"
      description="AI writes a complete 2000-3000 word blog draft incorporating all collected data, outline structure, and credibility elements."
    >
      {/* Instructions */}
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
            <li>AI generates complete blog draft (2000-3000 words)</li>
            <li>Follows the outline structure from Step 7</li>
            <li>Incorporates all data points, tools, links, and credibility elements</li>
            <li>Applies LLM optimization techniques (glossary, summaries, etc.)</li>
            <li>Uses informal tone, short paragraphs, and mobile-first approach</li>
            <li>Includes first-person experiences and proper citations</li>
          </ul>
        </div>
      )}

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={17}
          stepName="Blog Draft Generation"
          estimatedSeconds={60}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={17}
          stepName="Blog Draft Generation"
        />
      )}

      {/* Results Display */}
      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-4">
          {/* Success Banner */}
          <SuccessBanner
            stepNumber={17}
            stepName="Blog Draft Generation"
            message="Generated complete blog draft with 2000+ words"
          />

          {/* LLM Prompt Display */}
          <PromptDisplay
            prompt={stepData?.llm_prompt}
            title="LLM Prompt Sent to OpenAI"
          />

          {/* Stats Bar */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Blog Draft Complete!
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-700">
                  {stepData.word_count && (
                    <span className="flex items-center gap-1">
                      <span className="font-semibold">{stepData.word_count.toLocaleString()}</span> words
                    </span>
                  )}
                  {stepData.sections_included && (
                    <span className="flex items-center gap-1">
                      <span className="font-semibold">{stepData.sections_included.length}</span> sections
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyToClipboard}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  📋 Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  ⬇️ Download
                </button>
              </div>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-lg w-fit">
            <button
              onClick={() => setViewMode('rendered')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'rendered'
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Rendered View
            </button>
            <button
              onClick={() => setViewMode('markdown')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'markdown'
                  ? 'bg-white text-blue-600 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Markdown Source
            </button>
          </div>

          {/* Blog Draft Content */}
          {stepData.blog_draft && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              {viewMode === 'rendered' ? (
                <div className="prose max-w-none">
                  {/* Simple markdown-like rendering */}
                  <div className="whitespace-pre-wrap">{stepData.blog_draft}</div>
                </div>
              ) : (
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap">
                  {stepData.blog_draft}
                </pre>
              )}
            </div>
          )}

          {/* Sections Included */}
          {stepData.sections_included && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Sections Included:</h4>
              <div className="flex flex-wrap gap-2">
                {stepData.sections_included.map((section: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm text-gray-700"
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {stepData.summary && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Summary</h4>
              <p className="text-green-800">{stepData.summary}</p>
            </div>
          )}

          {/* Full Data */}
          <AIOutputDisplay
            title="Complete Step Data (JSON)"
            data={stepData}
            format="json"
            collapsible={true}
          />
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={17}
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
