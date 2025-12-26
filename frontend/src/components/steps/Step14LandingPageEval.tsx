/**
 * Step 14: Landing Page Evaluation
 * AI suggests landing page opportunities based on blog content
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
import PromptDisplay from '../shared/PromptDisplay';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Step14Props {
  sessionId: string;
  initialData?: any;
}

export default function Step14LandingPageEval({ sessionId, initialData }: Step14Props) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [stepData, setStepData] = useState<any>(initialData || null);
  const [error, setError] = useState<string | null>(null);

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

      const result = await api.executeStep14LandingPage(sessionId, token);

      if (result.success && result.data) {
        setStepData(result.data);
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to evaluate landing pages');
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

      await api.skipStep(14, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    // Navigate back to dashboard
    window.location.href = '/creator/dashboard';
  };

  const renderSuggestions = () => {
    if (!stepData) return null;

    const suggestions = stepData.landing_page_suggestions || stepData.suggestions || [];

    return (
      <div className="space-y-6">
        {/* Overview */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl">🎯</div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Landing Page Opportunities (Send these details to Team Lead or Relevant Person for Landing page creation )
              </h3>
              <p className="text-sm text-gray-600">
                {stepData.count || suggestions.length} landing page suggestions identified
              </p>
            </div>
          </div>
        </div>

        {/* Landing Page Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-4">
            {suggestions.map((suggestion: any, index: number) => (
              <div
                key={index}
                className="bg-white border-2 border-indigo-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                {/* Title */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-2xl">{index + 1}.</div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">
                      {suggestion.title || suggestion.page_title}
                    </h4>
                    <p className="text-gray-700 mb-4">
                      {suggestion.description || suggestion.rationale}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Target Audience */}
                  {suggestion.target_audience && (
                    <div className="p-4 bg-purple-50 rounded border border-purple-200">
                      <div className="text-xs font-semibold text-purple-600 uppercase mb-2">
                        Target Audience
                      </div>
                      <p className="text-sm text-gray-700">
                        {suggestion.target_audience}
                      </p>
                    </div>
                  )}

                  {/* Conversion Points */}
                  {suggestion.conversion_points && (
                    <div className="p-4 bg-green-50 rounded border border-green-200">
                      <div className="text-xs font-semibold text-green-600 uppercase mb-2">
                        Conversion Points
                      </div>
                      {Array.isArray(suggestion.conversion_points) ? (
                        <ul className="space-y-1">
                          {suggestion.conversion_points.map((point: string, i: number) => (
                            <li key={i} className="text-sm text-gray-700">• {point}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-700">
                          {suggestion.conversion_points}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* CTA Recommendation */}
                {suggestion.cta && (
                  <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                    <div className="text-xs font-semibold text-blue-600 uppercase mb-2">
                      Recommended CTA
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {suggestion.cta}
                    </p>
                  </div>
                )}

                {/* Value Proposition */}
                {suggestion.value_proposition && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded border border-yellow-200">
                    <div className="text-xs font-semibold text-yellow-600 uppercase mb-2">
                      Value Proposition
                    </div>
                    <p className="text-sm text-gray-700">
                      {suggestion.value_proposition}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {suggestions.length === 0 && (
          <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-gray-600">
              No landing page opportunities identified for this blog topic.
            </p>
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
        <AIOutputDisplay title="Landing Page Evaluation Details" data={stepData} collapsible={true} />
      </div>
    );
  };

  return (
    <StepContainer
      stepNumber={14}
      stepName="Landing Page Evaluation"
      owner="AI"
      description="AI analyzes the blog content to suggest landing page opportunities. Send details to Team Lead or Relevant person."
    >
      {/* Instructions */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>AI Task:</strong> Analyze the blog outline and content to suggest
          potential landing pages that could convert blog readers into leads or customers.
        </p>
      </div>

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={14}
          stepName="Landing Page Evaluation"
          estimatedSeconds={30}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={14}
          stepName="Landing Page Evaluation"
        />
      )}

      {/* Results */}
      {executionComplete && !isExecuting && stepData && (
        <div className="space-y-6">
          <SuccessBanner
            stepNumber={14}
            stepName="Landing Page Evaluation"
            message="Evaluated landing page opportunities based on blog content"
          />

          {/* LLM Prompt Display */}
          <PromptDisplay
            prompt={stepData?.llm_prompt}
            title="LLM Prompt Sent to OpenAI"
          />

          {renderSuggestions()}
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={14}
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
