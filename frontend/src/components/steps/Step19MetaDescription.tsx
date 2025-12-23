/**
 * Step 19: Meta Description
 * AI creates 150-160 character SEO-optimized meta description
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

interface Step19Props {
  sessionId: string;
  initialData?: any;
}

export default function Step19MetaDescription({ sessionId, initialData }: Step19Props) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [stepData, setStepData] = useState<any>(initialData || null);
  const [error, setError] = useState<string | null>(null);

  // Unsaved changes tracking for editable AI output
  const { hasUnsavedChanges, setHasUnsavedChanges, resetUnsavedChanges } = useUnsavedChanges();

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

      const result = await api.executeStep19MetaDescription(sessionId, token);

      if (result.success && result.data) {
        setStepData(result.data);
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to generate meta description');
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

      await api.skipStep(19, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    // Navigate back to dashboard
    window.location.href = '/creator/dashboard';
  };

  const copyToClipboard = () => {
    if (stepData?.meta_description) {
      navigator.clipboard.writeText(stepData.meta_description);
      alert('Meta description copied to clipboard!');
    }
  };

  const renderMetaDescription = () => {
    if (!stepData) return null;

    const metaDesc = stepData.meta_description || '';
    const charCount = stepData.character_count || metaDesc.length;
    const withinLimit = stepData.within_limit !== undefined
      ? stepData.within_limit
      : (charCount >= 150 && charCount <= 160);

    return (
      <div className="space-y-6">
        {/* Overview */}
        <div className={`border-2 rounded-lg p-6 ${
          withinLimit
            ? 'bg-gradient-to-r from-green-50 to-teal-50 border-green-300'
            : 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-300'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-4xl">✍️</div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Meta Description Generated
                </h3>
                <p className={`text-sm font-medium ${
                  withinLimit ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {charCount} characters {withinLimit ? '(Optimal)' : '(Needs adjustment)'}
                </p>
              </div>
            </div>
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Meta Description Display */}
        <div className="bg-white border-2 border-gray-300 rounded-lg p-6">
          <div className="mb-3 text-xs font-semibold text-gray-600 uppercase">
            Meta Description
          </div>
          <p className="text-lg text-gray-900 leading-relaxed mb-4">
            "{metaDesc}"
          </p>

          {/* Character Count Bar */}
          <div className="relative">
            <div className="flex justify-between text-xs text-gray-600 mb-2">
              <span>0</span>
              <span className="font-medium">150-160 (optimal)</span>
              <span>200</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  charCount < 150
                    ? 'bg-yellow-500'
                    : charCount <= 160
                    ? 'bg-green-500'
                    : charCount <= 200
                    ? 'bg-orange-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${Math.min((charCount / 200) * 100, 100)}%` }}
              />
            </div>
            <div className="mt-2 text-center">
              <span className={`text-sm font-semibold ${
                withinLimit ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {charCount} / 160 characters
              </span>
            </div>
          </div>

          {/* Validation Messages */}
          <div className="mt-4 space-y-2">
            {charCount < 150 && (
              <div className="flex items-center gap-2 text-sm text-yellow-700">
                <span>⚠️</span>
                <span>Too short - add {150 - charCount} more characters</span>
              </div>
            )}
            {charCount > 160 && charCount <= 200 && (
              <div className="flex items-center gap-2 text-sm text-orange-700">
                <span>⚠️</span>
                <span>Slightly long - remove {charCount - 160} characters for optimal length</span>
              </div>
            )}
            {charCount > 200 && (
              <div className="flex items-center gap-2 text-sm text-red-700">
                <span>❌</span>
                <span>Too long - meta will be truncated in search results</span>
              </div>
            )}
            {withinLimit && (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <span>✓</span>
                <span>Perfect length for SEO!</span>
              </div>
            )}
          </div>
        </div>

        {/* SERP Preview */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="mb-3 text-xs font-semibold text-gray-600 uppercase">
            Google Search Preview
          </div>
          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <div className="text-blue-700 text-xl hover:underline cursor-pointer mb-1">
              Your Blog Title
            </div>
            <div className="text-green-700 text-sm mb-2">
              https://yourdomain.com/blog/slug
            </div>
            <div className="text-gray-700 text-sm">
              {metaDesc.length > 160 ? metaDesc.substring(0, 157) + '...' : metaDesc}
            </div>
          </div>
        </div>

        {/* Editable Meta Description */}
        {stepData.meta_description && (
          <EditableOutput
            stepNumber={19}
            sessionId={sessionId}
            title="Meta Description (Editable)"
            initialData={stepData.meta_description}
            dataKey="meta_description"
            computeAdditionalFields={(editedText) => ({
              character_count: editedText.length,
              within_limit: editedText.length >= 150 && editedText.length <= 160
            })}
            onSave={(updatedData) => {
              setStepData({
                ...stepData,
                meta_description: updatedData,
                character_count: updatedData.length,
                within_limit: updatedData.length >= 150 && updatedData.length <= 160
              });
            }}
            onEditStart={() => setHasUnsavedChanges(true)}
            onSaveSuccess={() => resetUnsavedChanges()}
          />
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
        <AIOutputDisplay title="Meta Description Details" data={stepData} collapsible={true} />
      </div>
    );
  };

  return (
    <StepContainer
      stepNumber={19}
      stepName="Meta Description"
      owner="AI"
      description="AI creates SEO-optimized meta description for search engines"
    >
      {/* Instructions */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>AI Task:</strong> Generate a compelling 150-160 character meta description
          that includes the primary keyword and entices clicks from search results.
        </p>
      </div>

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={19}
          stepName="Meta Description"
          estimatedSeconds={30}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={19}
          stepName="Meta Description"
        />
      )}

      {/* Results */}
      {executionComplete && !isExecuting && stepData && (
        <div className="space-y-6">
          <SuccessBanner
            stepNumber={19}
            stepName="Meta Description"
            message="Generated SEO-optimized meta description"
          />
          {renderMetaDescription()}
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={19}
        isExecuting={isExecuting}
        canExecute={!executionComplete}
        canSkip={false}
        onExecute={handleExecute}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </StepContainer>
  );
}
