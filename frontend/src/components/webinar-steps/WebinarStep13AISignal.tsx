/**
 * Webinar Step 13: AI Signal Removal
 * AI removes AI-generated patterns and phrases
 * Owner: AI - Adapted from Step20AISignalRemoval
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

interface WebinarStep13Props {
  sessionId: string;
  initialData?: any;
  onStepComplete?: () => Promise<void>;
}

export default function WebinarStep13AISignal({ sessionId, initialData, onStepComplete }: WebinarStep13Props) {
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

      const result = await api.executeWebinarStep13(sessionId, token);

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

      await api.skipWebinarStep(13, { session_id: sessionId, reason }, token);
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
      stepNumber={13}
      stepName="AI Signal Removal"
      owner="AI"
      description="AI removes AI-generated patterns and phrases to sound more human"
    >
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-purple-800 space-y-1 text-sm">
            <li>AI detects and removes common AI-generated phrases</li>
            <li>Makes content sound more natural and human-written</li>
            <li>Preserves meaning while improving authenticity</li>
          </ul>
        </div>
      )}

      {isExecuting && (
        <ProgressAnimation stepNumber={13} stepName="AI Signal Removal" estimatedSeconds={50} />
      )}

      {error && (
        <ErrorBanner error={error} onRetry={handleExecute} stepNumber={13} stepName="AI Signal Removal" />
      )}

      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-4">
          <SuccessBanner
            stepNumber={13}
            stepName="AI Signal Removal"
            message={`Cleaned blog draft - removed ${stepData.changes_made || 0} AI patterns`}
          />

          <div className="bg-white border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">Cleanup Summary</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm text-purple-700">Changes Made</p>
                <p className="text-2xl font-bold text-purple-900">{stepData.changes_made || 0}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-green-700">Status</p>
                <p className="text-lg font-semibold text-green-900">
                  {stepData.changes_made > 0 ? 'Cleaned' : 'No changes needed'}
                </p>
              </div>
            </div>

            {/* FIX (2025-01-02): Backend returns "ai_signals_removed" not "removed_patterns" */}
            {/* Field name mismatch was causing "Removed Patterns" section to never display */}
            {stepData.ai_signals_removed && stepData.ai_signals_removed.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Removed Patterns</h4>
                <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
                  {stepData.ai_signals_removed.map((pattern: string, idx: number) => (
                    <li key={idx}>{pattern}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {stepData.llm_prompt && <PromptDisplay prompt={stepData.llm_prompt} />}
        </div>
      )}

      <StepNavigation
        currentStep={13}
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
