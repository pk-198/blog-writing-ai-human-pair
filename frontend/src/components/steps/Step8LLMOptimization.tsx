/**
 * Step 8: LLM Optimization Planning
 * AI marks sections for LLM/GEO optimization techniques
 * Owner: AI
 */

'use client';

import React, { useState, useEffect } from 'react';
import StepContainer from '../shared/StepContainer';
import AIOutputDisplay from '../shared/AIOutputDisplay';
import SuccessBanner from '../shared/SuccessBanner';
import ErrorBanner from '../shared/ErrorBanner';
import ProgressAnimation from '../shared/ProgressAnimation';
import StepNavigation from '../shared/StepNavigation';
import PromptDisplay from '../shared/PromptDisplay';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Step8Props {
  sessionId: string;
  initialData?: any;
}

export default function Step8LLMOptimization({ sessionId, initialData }: Step8Props) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [stepData, setStepData] = useState<any>(initialData || null);
  const [error, setError] = useState<string | null>(null);

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

      const result = await api.executeStep8LLMOptimization(sessionId, token);

      if (result.success && result.data) {
        setStepData(result.data);
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to create optimization plan');
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

      await api.skipStep(8, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    // Navigate back to dashboard
    window.location.href = '/creator/dashboard';
  };

  const renderOptimizationPlan = () => {
    if (!stepData) return null;

    const glossaryItems = stepData.glossary_items || [];
    const whatIsSections = stepData.what_is_sections || [];

    return (
      <div className="space-y-6">
        {/* Success Banner */}
        <SuccessBanner
          stepNumber={8}
          stepName="LLM Optimization Planning"
          message="Created nuanced optimization plan for AI/GEO visibility"
        />

        {/* LLM Prompt Display */}
        <PromptDisplay
          prompt={stepData?.llm_prompt}
          title="LLM Prompt Sent to OpenAI"
        />

        {/* Overview */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">🎯</div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Nuanced LLM Optimization Plan
              </h3>
              <p className="text-sm text-gray-600">
                Blog-specific glossary terms and "What is X" sections identified
              </p>
            </div>
          </div>
        </div>

        {/* Optimization Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Glossary Items */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📚</span>
              <h4 className="font-semibold text-gray-900">Glossary Items</h4>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              {glossaryItems.length} nuanced terms to define (3-4 expected)
            </p>
            <div className="text-3xl font-bold text-blue-600 mb-4">
              {glossaryItems.length}
            </div>
            {glossaryItems.length > 0 && (
              <div className="space-y-3">
                {glossaryItems.map((item: any, index: number) => (
                  <div key={index} className="p-3 bg-blue-50 rounded border border-blue-100">
                    <div className="font-medium text-gray-900 text-sm mb-1">
                      {item.term}
                    </div>
                    {item.reason && (
                      <div className="text-xs text-gray-600">
                        {item.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* What Is Sections */}
          <div className="bg-white border-2 border-green-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">❓</span>
              <h4 className="font-semibold text-gray-900">"What is X" Sections</h4>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              {whatIsSections.length} specific headings to add (2-3 expected)
            </p>
            <div className="text-3xl font-bold text-green-600 mb-4">
              {whatIsSections.length}
            </div>
            {whatIsSections.length > 0 && (
              <div className="space-y-3">
                {whatIsSections.map((section: any, index: number) => (
                  <div key={index} className="p-3 bg-green-50 rounded border border-green-100">
                    <div className="font-medium text-gray-900 text-sm mb-1">
                      {section.heading}
                    </div>
                    {section.reason && (
                      <div className="text-xs text-gray-600">
                        {section.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

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
        <AIOutputDisplay title="LLM Optimization Plan Details" data={stepData} collapsible={true} />
      </div>
    );
  };

  return (
    <StepContainer
      stepNumber={8}
      stepName="LLM Optimization Planning"
      owner="AI"
      description="AI identifies sections that should be optimized for LLM/GEO visibility using specific formatting techniques"
    >
      {/* Instructions */}
      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>AI Task:</strong> Analyze the complete outline (including all H2, H3, H4 subsections)
          to identify 3-4 nuanced glossary terms and 2-3 specific "What is X" sections. Focus on
          blog-specific, unique terms from deeper subsections rather than generic industry terms.
        </p>
      </div>

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={8}
          stepName="LLM Optimization Planning"
          estimatedSeconds={30}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={8}
          stepName="LLM Optimization Planning"
        />
      )}

      {/* Results */}
      {executionComplete && !isExecuting && stepData && renderOptimizationPlan()}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={8}
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
