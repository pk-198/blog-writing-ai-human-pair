/**
 * Step 3: Competitor Analysis
 * AI analyzes competitor content to identify patterns and differentiators
 * Owner: AI
 * Includes unsaved changes detection for editable AI output
 */

'use client';

import React, { useState } from 'react';
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

interface Step3Props {
  sessionId: string;
  initialData?: any;
}

export default function Step3CompetitorAnalysis({ sessionId, initialData }: Step3Props) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [stepData, setStepData] = useState(initialData || null);
  const [error, setError] = useState<string | null>(null);

  // Unsaved changes tracking for editable AI output
  const { hasUnsavedChanges, setHasUnsavedChanges, resetUnsavedChanges } = useUnsavedChanges();

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep3CompetitorAnalysis(sessionId, token);

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

      await api.skipStep(3, { session_id: sessionId, reason }, token);
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
      stepNumber={3}
      stepName="Competitor Analysis"
      owner="AI"
      description="AI analyzes the fetched competitor content to identify must-have elements (quintessential), unique differentiators, and recommended sections for your blog."
    >
      {/* Instructions */}
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
            <li>AI identifies <strong>quintessential elements</strong> present in ALL top results (must-have)</li>
            <li>Discovers <strong>differentiators</strong> - unique elements that add credibility</li>
            <li>Recommends which sections to include/recreate in your blog</li>
            <li>Identifies competitor-specific sections to skip</li>
          </ul>
        </div>
      )}

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={3}
          stepName="Competitor Analysis"
          estimatedSeconds={35}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={3}
          stepName="Competitor Analysis"
        />
      )}

      {/* Results Display */}
      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-6">
          {/* Success Banner */}
          <SuccessBanner
            stepNumber={3}
            stepName="Competitor Analysis"
            message="Analyzed competitor content patterns and identified key elements"
          />

          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Competitor Analysis Results
          </h3>

          {/* Quintessential Elements */}
          {stepData.quintessential_elements && (
            <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
              <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <span className="text-xl">🎯</span>
                Quintessential Elements (Must-Have)
              </h4>
              <p className="text-sm text-red-700 mb-3">
                These elements appear in ALL top-ranking competitors. Your blog must include these to compete.
              </p>
              {Array.isArray(stepData.quintessential_elements) ? (
                <ul className="space-y-2">
                  {stepData.quintessential_elements.map((element: any, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-600 font-bold">✓</span>
                      <span className="text-red-900">{typeof element === 'string' ? element : element.description || JSON.stringify(element)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <pre className="text-sm text-red-900 whitespace-pre-wrap">
                  {JSON.stringify(stepData.quintessential_elements, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Differentiators */}
          {stepData.differentiators && (
            <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <span className="text-xl">⭐</span>
                Differentiators (Credibility Boosters)
              </h4>
              <p className="text-sm text-blue-700 mb-3">
                Unique elements that make top competitors stand out. Consider incorporating these.
              </p>
              {Array.isArray(stepData.differentiators) ? (
                <ul className="space-y-2">
                  {stepData.differentiators.map((diff: any, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-600">→</span>
                      <span className="text-blue-900">{typeof diff === 'string' ? diff : diff.description || JSON.stringify(diff)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <pre className="text-sm text-blue-900 whitespace-pre-wrap">
                  {JSON.stringify(stepData.differentiators, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Sections to Include */}
          {stepData.sections_to_include && (
            <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
              <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <span className="text-xl">✅</span>
                Recommended Sections to Include
              </h4>
              {Array.isArray(stepData.sections_to_include) ? (
                <ul className="space-y-2">
                  {stepData.sections_to_include.map((section: any, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-600">+</span>
                      <span className="text-green-900">{typeof section === 'string' ? section : section.title || JSON.stringify(section)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <pre className="text-sm text-green-900 whitespace-pre-wrap">
                  {JSON.stringify(stepData.sections_to_include, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Sections to Skip */}
          {stepData.sections_to_skip && (
            <div className="border-l-4 border-gray-400 bg-gray-50 p-4 rounded">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-xl">⛔</span>
                Sections to Skip
              </h4>
              <p className="text-sm text-gray-700 mb-3">
                Competitor-specific sections that don't apply to your blog.
              </p>
              {Array.isArray(stepData.sections_to_skip) ? (
                <ul className="space-y-2">
                  {stepData.sections_to_skip.map((section: any, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-600">×</span>
                      <span className="text-gray-800">{typeof section === 'string' ? section : section.title || JSON.stringify(section)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                  {JSON.stringify(stepData.sections_to_skip, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Summary */}
          {stepData.summary && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Summary</h4>
              <p className="text-green-800">{stepData.summary}</p>
            </div>
          )}

          {/* Full Analysis Data - Editable */}
          <EditableOutput
            stepNumber={3}
            sessionId={sessionId}
            title="Complete Analysis Data (Editable JSON)"
            initialData={stepData}
            dataKey="analysis"
            onSave={(updatedData) => {
              setStepData({ ...stepData, ...updatedData });
            }}
            onEditStart={() => setHasUnsavedChanges(true)}
            onSaveSuccess={() => resetUnsavedChanges()}
          />
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={3}
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
