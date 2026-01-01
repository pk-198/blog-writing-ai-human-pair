/**
 * Webinar Step 7: LLM Optimization Planning
 * AI identifies glossary terms and "What is X?" sections
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

interface WebinarStep7Props {
  sessionId: string;
  initialData?: any;
  onStepComplete?: () => Promise<void>;
}

export default function WebinarStep7LLMOptimization({ sessionId, initialData, onStepComplete }: WebinarStep7Props) {
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

      const result = await api.executeWebinarStep7(sessionId, token);

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

      await api.skipWebinarStep(7, { session_id: sessionId, reason }, token);
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
      stepNumber={7}
      stepName="LLM Optimization Planning"
      owner="AI"
      description="AI identifies glossary terms and 'What is X?' sections for LLM optimization"
    >
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-purple-800 space-y-1 text-sm">
            <li>AI identifies 3-4 technical terms for glossary</li>
            <li>Selects 2-3 concepts for "What is X?" sections</li>
            <li>Plans LLM optimization markers for final draft</li>
          </ul>
        </div>
      )}

      {isExecuting && (
        <ProgressAnimation stepNumber={7} stepName="LLM Optimization Planning" estimatedSeconds={35} />
      )}

      {error && (
        <ErrorBanner error={error} onRetry={handleExecute} stepNumber={7} stepName="LLM Optimization Planning" />
      )}

      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-4">
          <SuccessBanner
            stepNumber={7}
            stepName="LLM Optimization Planning"
            message="Successfully identified LLM optimization opportunities"
          />

          <div className="bg-white border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">LLM Optimization Plan</h3>

            {stepData.glossary_items && stepData.glossary_items.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Glossary Terms ({stepData.glossary_items.length})</h4>
                <div className="space-y-3">
                  {stepData.glossary_items.map((item: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded p-3">
                      <h5 className="font-medium text-purple-900">{item.term}</h5>
                      <p className="text-sm text-gray-700 mt-1">{item.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stepData.what_is_sections && stepData.what_is_sections.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  "What is X?" Sections ({stepData.what_is_sections.length})
                </h4>
                <div className="space-y-3">
                  {stepData.what_is_sections.map((section: any, idx: number) => (
                    <div key={idx} className="border border-gray-200 rounded p-3">
                      {/* Fix: Backend returns complete "What is X?" text in topic field, not separate concept */}
                      <h5 className="font-medium text-purple-900">{section.topic}</h5>
                      <p className="text-sm text-gray-600 mt-1">Rationale: {section.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {stepData.llm_prompt && <PromptDisplay prompt={stepData.llm_prompt} />}
        </div>
      )}

      <StepNavigation
        currentStep={7}
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
