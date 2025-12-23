/**
 * Step 5: Secondary Keywords
 * Human researches and adds 8-12 secondary keywords
 * Owner: Human
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Step5Props {
  sessionId: string;
  initialData?: any;
}

export default function Step5SecondaryKeywords({ sessionId, initialData }: Step5Props) {
  const [keywords, setKeywords] = useState<string[]>(
    initialData?.secondary_keywords || ['']
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [error, setError] = useState<string | null>(null);

  const handleAddKeyword = () => {
    setKeywords([...keywords, '']);
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleKeywordChange = (index: number, value: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = value;
    setKeywords(newKeywords);
  };

  const handleSubmit = async (proceedWithFewer: boolean = false) => {
    // Validation
    const validKeywords = keywords.filter(k => k.trim().length > 0);

    if (validKeywords.length < 8 && !proceedWithFewer) {
      setError('Please add at least 8 secondary keywords, or use "Proceed with Fewer Inputs"');
      return;
    }

    if (validKeywords.length > 12) {
      setError('Maximum 12 secondary keywords allowed');
      return;
    }

    // If proceeding with fewer, ask for reason
    let fewerInputsReason = '';
    if (proceedWithFewer) {
      fewerInputsReason = prompt('Why are you proceeding with fewer than 8 keywords? (e.g., "Limited keyword opportunities for niche topic")');
      if (!fewerInputsReason) return; // User cancelled
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep5SecondaryKeywords(
        sessionId,
        validKeywords,
        token,
        proceedWithFewer,
        fewerInputsReason
      );

      if (result.success) {
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to save keywords');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProceedWithFewer = () => {
    handleSubmit(true);
  };

  const handleSkip = async () => {
    const reason = prompt('Why are you skipping this step?');
    if (!reason) return;

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      await api.skipStep(5, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  const validCount = keywords.filter(k => k.trim().length > 0).length;

  return (
    <StepContainer
      stepNumber={5}
      stepName="Secondary Keywords"
      owner="Human"
      description="Research and add 8-12 secondary keywords to target alongside your primary keyword for better SEO coverage."
    >
      {/* Instructions */}
      {!executionComplete && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">Your Task:</h3>
          <ul className="list-disc list-inside text-green-800 space-y-1 text-sm">
            <li>Get secondary keywords from "Keywords Everywhere" tool</li>
            <li>Get from “People also ask” section on Google</li>
            <li>Focus on long-tail variations from soovle.com and Google Search Box Auto Fill</li>
          </ul>
        </div>
      )}

      {/* Keyword Input Form */}
      {!executionComplete && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Secondary Keywords ({validCount}/8-12)
            </h3>
            <button
              onClick={handleAddKeyword}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              + Add Keyword
            </button>
          </div>

          {/* Keyword Input Fields */}
          <div className="space-y-3">
            {keywords.map((keyword, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => handleKeywordChange(index, e.target.value)}
                  placeholder={`Secondary keyword ${index + 1}`}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {keywords.length > 1 && (
                  <button
                    onClick={() => handleRemoveKeyword(index)}
                    className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Validation Message */}
          {validCount < 8 && (
            <p className="text-sm text-gray-600">
              Add {8 - validCount} more {8 - validCount === 1 ? 'keyword' : 'keywords'} to meet the minimum requirement
            </p>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || validCount < 8}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSubmitting ? 'Saving Keywords...' : 'Save Keywords & Continue'}
            </button>

            {/* Proceed with Fewer Inputs Button (only show if less than minimum) */}
            {validCount > 0 && validCount < 8 && (
              <button
                onClick={handleProceedWithFewer}
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                title="Proceed with fewer than 8 keywords (requires justification)"
              >
                ⚠️ Proceed with {validCount} {validCount === 1 ? 'Keyword' : 'Keywords'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Completion State */}
      {executionComplete && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3">Keywords Saved</h3>
            <div className="flex flex-wrap gap-2">
              {keywords.filter(k => k.trim().length > 0).map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-white border border-green-300 rounded-full text-green-800 text-sm"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={5}
        isExecuting={isSubmitting}
        canExecute={false} // Human step uses submit button instead
        canSkip={!executionComplete}
        onExecute={() => {}} // Not used for human steps
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
      />
    </StepContainer>
  );
}
