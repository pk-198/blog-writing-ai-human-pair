/**
 * Step 16: Title Creation
 * AI generates 3 SEO-optimized title options
 * Owner: AI
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import AIOutputDisplay from '../shared/AIOutputDisplay';
import SuccessBanner from '../shared/SuccessBanner';
import ErrorBanner from '../shared/ErrorBanner';
import ProgressAnimation from '../shared/ProgressAnimation';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Step16Props {
  sessionId: string;
  initialData?: any;
}

export default function Step16TitleCreation({ sessionId, initialData }: Step16Props) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [stepData, setStepData] = useState(initialData || null);
  const [selectedTitle, setSelectedTitle] = useState<number | null>(
    initialData?.selected_title_index ?? null
  );
  const [error, setError] = useState<string | null>(null);

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep16TitleCreation(sessionId, token);

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

      await api.skipStep(16, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  const handleSelectTitle = (index: number) => {
    setSelectedTitle(index);
  };

  const getTitleLength = (title: string) => {
    return title.replace(/[^\x00-\x7F]/g, '').length; // Count without emojis
  };

  return (
    <StepContainer
      stepNumber={16}
      stepName="Title Creation"
      owner="AI"
      description="AI generates 3 SEO-optimized title options that are ~55 characters, start with the primary keyword, and include power words or emojis."
    >
      {/* Instructions */}
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
            <li>AI generates 3 title options optimized for SEO and click-through</li>
            <li>Each title is ~55 characters (Google's title display limit)</li>
            <li>Starts with exact primary keyword for ranking</li>
            <li>Includes power words (Ultimate, Proven, Essential, Expert-approved, etc.)</li>
            <li>May include emojis or bracketed keywords for visual appeal</li>
          </ul>
        </div>
      )}

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={16}
          stepName="Title Creation"
          estimatedSeconds={30}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={16}
          stepName="Title Creation"
        />
      )}

      {/* Results Display */}
      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-6">
          {/* Success Banner */}
          <SuccessBanner
            stepNumber={16}
            stepName="Title Creation"
            message="Generated 3 SEO-optimized title options"
          />

          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Title Options
          </h3>

          {/* Title Options */}
          {stepData.title_options && stepData.title_options.length > 0 && (
            <div className="space-y-4">
              {stepData.title_options.map((option: any, index: number) => {
                const titleText = typeof option === 'string' ? option : option.title || option.text;
                const titleLength = getTitleLength(titleText);
                const isOptimalLength = titleLength >= 50 && titleLength <= 60;
                const isSelected = selectedTitle === index;

                return (
                  <div
                    key={index}
                    onClick={() => handleSelectTitle(index)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-blue-400 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                            Option {index + 1}
                          </span>
                          {isSelected && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                              ✓ Selected
                            </span>
                          )}
                        </div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">
                          {titleText}
                        </h4>
                        <div className="flex items-center gap-4 text-sm">
                          <span className={`${
                            isOptimalLength ? 'text-green-600' : titleLength > 60 ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {titleLength} characters
                            {isOptimalLength && ' ✓'}
                          </span>
                          {typeof option === 'object' && option.power_word && (
                            <span className="text-purple-600">
                              Power word: <strong>{option.power_word}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectTitle(index);
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>

                    {/* Title Analysis */}
                    {typeof option === 'object' && option.analysis && (
                      <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                        {option.analysis}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Selection Info */}
          {selectedTitle !== null && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Selected Title:</h4>
              <p className="text-green-800 text-lg font-medium">
                {typeof stepData.title_options[selectedTitle] === 'string'
                  ? stepData.title_options[selectedTitle]
                  : stepData.title_options[selectedTitle]?.title || stepData.title_options[selectedTitle]?.text}
              </p>
              <p className="text-sm text-green-700 mt-2">
                This title will be used for the blog draft in Step 17
              </p>
            </div>
          )}

          {/* Title Guidelines */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Title Best Practices:</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>✓ 50-60 characters (optimal for Google display)</li>
              <li>✓ Starts with primary keyword</li>
              <li>✓ Includes power words (Ultimate, Proven, Essential, etc.)</li>
              <li>✓ Solution-oriented and compelling</li>
              <li>✓ May include emoji or [Bracketed Keywords] for visibility</li>
            </ul>
          </div>

          {/* Summary */}
          {stepData.summary && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Summary</h4>
              <p className="text-green-800">{stepData.summary}</p>
            </div>
          )}

          {/* Full Data */}
          <AIOutputDisplay
            title="Complete Title Data (JSON)"
            data={stepData}
            format="json"
            collapsible={true}
          />
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={16}
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
