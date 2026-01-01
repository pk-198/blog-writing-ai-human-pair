/**
 * Webinar Step 9: Infographic Planning
 * AI identifies data-heavy sections for infographics
 * Owner: AI - Adapted from Step15InfographicPlanning
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

interface WebinarStep9Props {
  sessionId: string;
  initialData?: any;
  onStepComplete?: () => Promise<void>;
}

export default function WebinarStep9Infographic({ sessionId, initialData, onStepComplete }: WebinarStep9Props) {
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

      const result = await api.executeWebinarStep9(sessionId, token);

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

      await api.skipWebinarStep(9, { session_id: sessionId, reason }, token);
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
      stepNumber={9}
      stepName="Infographic Planning"
      owner="AI"
      description="AI identifies data-heavy sections suitable for infographics"
    >
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-purple-800 space-y-1 text-sm">
            <li>AI analyzes transcript for data-heavy sections</li>
            <li>Identifies opportunities for visual infographics</li>
            <li>Suggests infographic types and content</li>
          </ul>
        </div>
      )}

      {isExecuting && (
        <ProgressAnimation stepNumber={9} stepName="Infographic Planning" estimatedSeconds={25} />
      )}

      {error && (
        <ErrorBanner error={error} onRetry={handleExecute} stepNumber={9} stepName="Infographic Planning" />
      )}

      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-4">
          <SuccessBanner
            stepNumber={9}
            stepName="Infographic Planning"
            message={`Identified ${stepData.infographic_ideas?.length || 0} infographic opportunities`}
          />

          <div className="bg-white border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">Infographic Opportunities</h3>

            {stepData.infographic_ideas && stepData.infographic_ideas.length > 0 ? (
              <div className="space-y-4">
                {stepData.infographic_ideas.map((idea: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{idea.title || idea.section}</h4>
                    <p className="text-sm text-gray-700 mb-2">{idea.description || idea.rationale}</p>
                    {idea.type && (
                      <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        {idea.type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No infographic opportunities identified.</p>
            )}
          </div>

          {stepData.llm_prompt && <PromptDisplay prompt={stepData.llm_prompt} />}
        </div>
      )}

      <StepNavigation
        currentStep={9}
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
