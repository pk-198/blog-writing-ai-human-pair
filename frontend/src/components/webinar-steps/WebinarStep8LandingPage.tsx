/**
 * Webinar Step 8: Landing Page Evaluation
 * AI evaluates landing page opportunities from webinar discussion
 * Owner: AI
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import SuccessBanner from '../shared/SuccessBanner';
import ErrorBanner from '../shared/ErrorBanner';
import ProgressAnimation from '../shared/ProgressAnimation';
import StepNavigation from '../shared/StepNavigation';
import PromptDisplay from '../shared/PromptDisplay';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface WebinarStep8Props {
  sessionId: string;
  initialData?: any;
  onStepComplete?: () => Promise<void>;
}

export default function WebinarStep8LandingPage({ sessionId, initialData, onStepComplete }: WebinarStep8Props) {
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
      if (!token) throw new Error('Not authenticated');

      const result = await api.executeWebinarStep8(sessionId, token);

      if (result.success) {
        setStepData(result.data);
        setExecutionComplete(true);
        if (onStepComplete) {
          await onStepComplete();
        }
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
      if (!token) throw new Error('Not authenticated');

      await api.skipWebinarStep(8, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  return (
    <StepContainer
      stepNumber={8}
      stepName="Landing Page Evaluation"
      owner="AI"
      description="AI analyzes webinar for product/topic landing page opportunities"
    >
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-purple-800 space-y-1 text-sm">
            <li>AI identifies products or topics discussed in webinar</li>
            <li>Evaluates potential for dedicated landing pages</li>
            <li>Recommends up to 2 landing page opportunities</li>
          </ul>
        </div>
      )}

      {isExecuting && (
        <ProgressAnimation stepNumber={8} stepName="Landing Page Evaluation" estimatedSeconds={30} />
      )}

      {error && (
        <ErrorBanner error={error} onRetry={handleExecute} stepNumber={8} stepName="Landing Page Evaluation" />
      )}

      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-4">
          <SuccessBanner
            stepNumber={8}
            stepName="Landing Page Evaluation"
            message={`Found ${stepData.count || 0} landing page opportunities`}
          />

          {/* Overview */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-4xl">🎯</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Landing Page Opportunities
                </h3>
                <p className="text-sm text-gray-600">
                  {stepData.count || 0} landing page suggestions identified from webinar content
                </p>
              </div>
            </div>
          </div>

          {/* Landing Page Suggestions */}
          {stepData.landing_page_suggestions && stepData.landing_page_suggestions.length > 0 ? (
            <div className="space-y-4">
              {stepData.landing_page_suggestions.map((suggestion: any, index: number) => (
                <div
                  key={index}
                  className="bg-white border-2 border-indigo-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  {/* Title */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="text-2xl">{index + 1}.</div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-900 mb-2">
                        {suggestion.title}
                      </h4>
                      <p className="text-gray-700 mb-4">
                        {suggestion.description}
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

                  {/* CTA Suggestions */}
                  {suggestion.cta_suggestions && suggestion.cta_suggestions.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                      <div className="text-xs font-semibold text-blue-600 uppercase mb-2">
                        Suggested CTAs
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {suggestion.cta_suggestions.map((cta: string, i: number) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                          >
                            {cta}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <p className="text-gray-600">
                No landing page opportunities identified for this webinar.
              </p>
            </div>
          )}

          {/* Recommendation */}
          {stepData.recommendation && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-green-900">Recommendation</span>
              </div>
              <p className="mt-2 text-gray-700">{stepData.recommendation}</p>
            </div>
          )}

          {stepData.llm_prompt && <PromptDisplay prompt={stepData.llm_prompt} />}
        </div>
      )}

      <StepNavigation
        currentStep={8}
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
