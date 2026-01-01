/**
 * Webinar Step 6: Outline Generation
 * AI generates blog outline from transcript and guidelines
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
import PromptDisplay from '../shared/PromptDisplay';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface WebinarStep6Props {
  sessionId: string;
  initialData?: any;
  onStepComplete?: () => Promise<void>;
}

export default function WebinarStep6Outline({ sessionId, initialData, onStepComplete }: WebinarStep6Props) {
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
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeWebinarStep6(sessionId, token);

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
      if (!token) {
        throw new Error('Not authenticated');
      }

      await api.skipWebinarStep(6, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  const handleRedo = async () => {
    setExecutionComplete(false);
    setStepData(null);
    setError(null);
    await handleExecute();
  };

  return (
    <StepContainer
      stepNumber={6}
      stepName="Outline Generation"
      owner="AI"
      description="AI generates blog outline from transcript and guidelines"
    >
      {/* Instructions */}
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h3 className="font-semibold text-purple-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-purple-800 space-y-1 text-sm">
            <li>AI analyzes webinar transcript for key insights and structure</li>
            <li>Considers competitor patterns and content guidelines</li>
            <li>Generates a structured outline with introduction, sections, and conclusion</li>
            <li>Tailors outline to content format (ghostwritten or conversational)</li>
          </ul>
        </div>
      )}

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={6}
          stepName="Outline Generation"
          estimatedSeconds={75}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={6}
          stepName="Outline Generation"
        />
      )}

      {/* Results Display */}
      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-4">
          <SuccessBanner
            stepNumber={6}
            stepName="Outline Generation"
            message="Successfully generated blog outline from webinar transcript"
          />

          {/* Outline Display */}
          <div className="bg-white border border-purple-200 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-purple-900">Blog Outline</h3>
              <button
                onClick={handleRedo}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                🔄 Regenerate
              </button>
            </div>

            {/* H1 Placeholder */}
            {stepData.h1_placeholder && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-xs font-semibold text-blue-600 uppercase mb-2">Main Title (H1)</h4>
                <p className="text-sm text-gray-700 font-medium">{stepData.h1_placeholder}</p>
              </div>
            )}

            {/* Sections */}
            {stepData.sections && stepData.sections.length > 0 && (
              <div className="space-y-4 mb-6">
                <h4 className="font-semibold text-purple-900">Main Sections ({stepData.sections.length})</h4>
                {stepData.sections.map((section: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <h5 className="font-medium text-gray-900 mb-3">
                      {idx + 1}. {section.h2}
                    </h5>
                    {section.subsections && section.subsections.length > 0 && (
                      <div className="ml-4 space-y-3">
                        {section.subsections.map((sub: any, subIdx: number) => (
                          <div key={subIdx} className="p-3 bg-white rounded border border-gray-200">
                            <div className="flex items-start gap-2">
                              <span className="text-purple-600 font-medium text-sm">{subIdx + 1}.</span>
                              <div className="flex-1">
                                <h6 className="font-medium text-gray-800 text-sm">{sub.h3}</h6>
                                {sub.description && (
                                  <p className="text-xs text-gray-600 mt-1">{sub.description}</p>
                                )}
                                {sub.content_type && (
                                  <span className="inline-block mt-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                                    {sub.content_type}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Special Sections */}
            {stepData.special_sections && Object.keys(stepData.special_sections).length > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-900 mb-3">Special Sections</h4>
                <div className="space-y-3">
                  {stepData.special_sections.glossary && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">Glossary: </span>
                      <span className="text-gray-700">
                        {stepData.special_sections.glossary.terms_count} terms - {stepData.special_sections.glossary.description}
                      </span>
                      {stepData.special_sections.glossary.position && (
                        <span className="ml-2 text-xs text-gray-600">({stepData.special_sections.glossary.position})</span>
                      )}
                    </div>
                  )}
                  {stepData.special_sections.conclusion && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">Conclusion: </span>
                      <span className="text-gray-700">
                        {stepData.special_sections.conclusion.key_takeaways}
                      </span>
                    </div>
                  )}
                  {stepData.special_sections.myths && (
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">Myths Section: </span>
                      <span className="text-gray-700">
                        {stepData.special_sections.myths.count} myths - {stepData.special_sections.myths.description}
                      </span>
                      {stepData.special_sections.myths.position && (
                        <span className="ml-2 text-xs text-gray-600">({stepData.special_sections.myths.position})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            {stepData.summary && (
              <div className="mt-4 text-sm text-gray-600">
                {stepData.summary}
              </div>
            )}
          </div>

          {/* LLM Prompt Display */}
          {stepData.llm_prompt && (
            <PromptDisplay prompt={stepData.llm_prompt} />
          )}
        </div>
      )}

      <StepNavigation
        currentStep={6}
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
