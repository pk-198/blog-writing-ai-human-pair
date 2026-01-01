/**
 * Webinar Step 10: Title Generation
 * AI generates 3 SEO-optimized title options
 * Owner: AI - Adapted from Step16TitleCreation
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

interface WebinarStep10Props {
  sessionId: string;
  initialData?: any;
  onStepComplete?: () => Promise<void>;
}

export default function WebinarStep10Title({ sessionId, initialData, onStepComplete }: WebinarStep10Props) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [stepData, setStepData] = useState(initialData || null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(
    initialData?.selected_title || null
  );

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) throw new Error('Not authenticated');

      const result = await api.executeWebinarStep10(sessionId, token);

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

      await api.skipWebinarStep(10, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  const handleSelectTitle = (title: string) => {
    setSelectedTitle(title);
  };

  return (
    <StepContainer
      stepNumber={10}
      stepName="Title Generation"
      owner="AI"
      description="AI generates 3 SEO-optimized title options"
    >
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-purple-800 space-y-1 text-sm">
            <li>AI generates 3 SEO-optimized title options</li>
            <li>Titles incorporate webinar topic and key insights</li>
            <li>You can select your preferred title</li>
          </ul>
        </div>
      )}

      {isExecuting && (
        <ProgressAnimation stepNumber={10} stepName="Title Generation" estimatedSeconds={20} />
      )}

      {error && (
        <ErrorBanner error={error} onRetry={handleExecute} stepNumber={10} stepName="Title Generation" />
      )}

      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-4">
          <SuccessBanner
            stepNumber={10}
            stepName="Title Generation"
            message="Generated 3 SEO-optimized title options"
          />

          <div className="bg-white border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">Choose Your Blog Title</h3>

            {stepData.title_options && stepData.title_options.length > 0 ? (
              <div className="space-y-3">
                {stepData.title_options.map((title: string, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectTitle(title)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedTitle === title
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                        selectedTitle === title
                          ? 'border-purple-600 bg-purple-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedTitle === title && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{title}</h4>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No title options generated.</p>
            )}

            {selectedTitle && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">
                  ✓ Selected: <strong>{selectedTitle}</strong>
                </p>
              </div>
            )}
          </div>

          {stepData.llm_prompt && <PromptDisplay prompt={stepData.llm_prompt} />}
        </div>
      )}

      <StepNavigation
        currentStep={10}
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
