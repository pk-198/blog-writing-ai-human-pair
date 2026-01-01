/**
 * Webinar Step 3: Competitor Analysis
 * AI analyzes competitor content for patterns and differentiators
 * Owner: AI - Adapted from Step3CompetitorAnalysis
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

interface WebinarStep3Props {
  sessionId: string;
  initialData?: any;
  onStepComplete?: () => Promise<void>;
}

export default function WebinarStep3CompetitorAnalysis({ sessionId, initialData, onStepComplete }: WebinarStep3Props) {
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

      const result = await api.executeWebinarStep3(sessionId, token);

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

      await api.skipWebinarStep(3, { session_id: sessionId, reason }, token);
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
      stepNumber={3}
      stepName="Competitor Analysis"
      owner="AI"
      description="AI analyzes competitor webinar blogs for structure and style patterns"
    >
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-purple-800 space-y-1 text-sm">
            <li>AI analyzes competitor content structure</li>
            <li>Identifies common topics and writing style patterns</li>
            <li>Extracts key insights to inform webinar blog outline</li>
          </ul>
        </div>
      )}

      {isExecuting && (
        <ProgressAnimation stepNumber={3} stepName="Competitor Analysis" estimatedSeconds={50} />
      )}

      {error && (
        <ErrorBanner error={error} onRetry={handleExecute} stepNumber={3} stepName="Competitor Analysis" />
      )}

      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-4">
          <SuccessBanner
            stepNumber={3}
            stepName="Competitor Analysis"
            message="Successfully analyzed competitor content patterns"
          />

          <div className="bg-white border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">Analysis Results</h3>

            {stepData.common_topics && stepData.common_topics.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Common Topics</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {stepData.common_topics.map((topic: string, idx: number) => (
                    <li key={idx}>{topic}</li>
                  ))}
                </ul>
              </div>
            )}

            {stepData.structural_patterns && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Structural Patterns</h4>
                <AIOutputDisplay title="Structural Patterns" data={stepData.structural_patterns} format="text" />
              </div>
            )}

            {stepData.writing_style && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Writing Style</h4>
                <AIOutputDisplay title="Writing Style" data={stepData.writing_style} format="text" />
              </div>
            )}

            {stepData.key_insights && stepData.key_insights.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Key Insights</h4>
                <ul className="list-disc list-inside text-gray-700 space-y-1">
                  {stepData.key_insights.map((insight: string, idx: number) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {stepData.llm_prompt && <PromptDisplay prompt={stepData.llm_prompt} />}
        </div>
      )}

      <StepNavigation
        currentStep={3}
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
