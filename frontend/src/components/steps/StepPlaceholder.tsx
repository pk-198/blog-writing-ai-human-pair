/**
 * StepPlaceholder - Temporary component for steps not yet implemented
 * Shows step info and provides execute/skip functionality
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import LoadingSpinner from '../shared/LoadingSpinner';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface StepPlaceholderProps {
  sessionId: string;
  stepNumber: number;
  stepName: string;
  owner: 'AI' | 'Human' | 'AI+Human';
  description: string;
  initialData?: any;
}

export default function StepPlaceholder({
  sessionId,
  stepNumber,
  stepName,
  owner,
  description,
  initialData
}: StepPlaceholderProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(!!initialData);
  const [stepData, setStepData] = useState(initialData || null);
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep(
        stepNumber,
        { session_id: sessionId },
        token
      );

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

      await api.skipStep(stepNumber, { session_id: sessionId, reason }, token);
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
      stepNumber={stepNumber}
      stepName={stepName}
      owner={owner}
      description={description}
    >
      {/* Info Banner */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          <strong>Note:</strong> Custom UI for this step is not yet implemented. You can still execute the step using the backend API, and results will be displayed below.
        </p>
      </div>

      {/* Loading State */}
      {isExecuting && (
        <LoadingSpinner
          message={`Executing ${stepName}...`}
          size="large"
        />
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={handleExecute}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results Display */}
      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Step Results
          </h3>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm font-mono border border-gray-200">
            {JSON.stringify(stepData, null, 2)}
          </pre>
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={stepNumber}
        isExecuting={isExecuting}
        canExecute={!executionComplete}
        canSkip={true}
        onExecute={handleExecute}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
      />
    </StepContainer>
  );
}
