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

    const plan = stepData.optimization_plan || {};
    const glossarySections = stepData.glossary_sections || plan.glossary_sections || [];
    const whatIsSections = stepData.what_is_sections || plan.what_is_sections || [];
    const summarySections = stepData.summary_sections || plan.summary_sections || [];
    const sections = plan.sections || [];

    return (
      <div className="space-y-6">
        {/* Success Banner */}
        <SuccessBanner
          stepNumber={8}
          stepName="LLM Optimization Planning"
          message="Created optimization plan for AI/GEO visibility"
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
                LLM Optimization Plan Created
              </h3>
              <p className="text-sm text-gray-600">
                Identified optimization opportunities for AI/GEO visibility
              </p>
            </div>
          </div>
        </div>

        {/* Optimization Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Glossary Sections */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📚</span>
              <h4 className="font-semibold text-gray-900">Glossary Terms</h4>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Sections needing terminology definitions
            </p>
            <div className="text-3xl font-bold text-blue-600">
              {glossarySections.length}
            </div>
            {glossarySections.length > 0 && (
              <div className="mt-3 space-y-1">
                {glossarySections.slice(0, 3).map((section: any, index: number) => (
                  <div key={index} className="text-xs text-gray-700 truncate">
                    • {typeof section === 'string' ? section : section.section || section.name || 'Section'}
                  </div>
                ))}
                {glossarySections.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{glossarySections.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>

          {/* What Is Sections */}
          <div className="bg-white border-2 border-green-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">❓</span>
              <h4 className="font-semibold text-gray-900">"What is" Format</h4>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Sections needing "What is X" structure
            </p>
            <div className="text-3xl font-bold text-green-600">
              {whatIsSections.length}
            </div>
            {whatIsSections.length > 0 && (
              <div className="mt-3 space-y-1">
                {whatIsSections.slice(0, 3).map((section: any, index: number) => (
                  <div key={index} className="text-xs text-gray-700 truncate">
                    • {typeof section === 'string' ? section : section.heading || section.section || section.topic || 'Section'}
                  </div>
                ))}
                {whatIsSections.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{whatIsSections.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary Sections */}
          <div className="bg-white border-2 border-purple-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📝</span>
              <h4 className="font-semibold text-gray-900">Summary Openers</h4>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Sections needing 1-line summary openers
            </p>
            <div className="text-3xl font-bold text-purple-600">
              {summarySections.length}
            </div>
            {summarySections.length > 0 && (
              <div className="mt-3 space-y-1">
                {summarySections.slice(0, 3).map((section: any, index: number) => (
                  <div key={index} className="text-xs text-gray-700 truncate">
                    • {typeof section === 'string' ? section : section.section || section.name || 'Section'}
                  </div>
                ))}
                {summarySections.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{summarySections.length - 3} more
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Detailed Section Plans */}
        {sections.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Section-by-Section Optimization Plan
            </h4>
            <div className="space-y-3">
              {sections.map((section: any, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded border border-gray-200"
                >
                  <div className="font-medium text-gray-900 mb-2">
                    {section.section_name || section.title}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {section.optimizations?.map((opt: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                  {section.rationale && (
                    <p className="mt-2 text-sm text-gray-600">
                      {section.rationale}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
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
          <strong>AI Task:</strong> Analyze the outline to mark which sections should use
          LLM-optimized formats like glossary terms, "What is X" structures, and summary
          openers for better AI search visibility.
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
