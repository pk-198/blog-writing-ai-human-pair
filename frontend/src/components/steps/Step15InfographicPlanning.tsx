/**
 * Step 15: Infographic Planning
 * AI suggests 2 infographic ideas based on data points
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
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Step15Props {
  sessionId: string;
  initialData?: any;
}

export default function Step15InfographicPlanning({ sessionId, initialData }: Step15Props) {
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

      const result = await api.executeStep15Infographic(sessionId, token);

      if (result.success && result.data) {
        setStepData(result.data);
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to create infographic plan');
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

      await api.skipStep(15, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    // Navigate back to dashboard
    window.location.href = '/creator/dashboard';
  };

  const getFormatIcon = (format: string) => {
    const f = format?.toLowerCase() || '';
    if (f.includes('pie')) return '🥧';
    if (f.includes('bar') || f.includes('chart')) return '📊';
    if (f.includes('timeline')) return '📅';
    if (f.includes('comparison')) return '⚖️';
    if (f.includes('flow')) return '🔄';
    if (f.includes('map')) return '🗺️';
    return '📈';
  };

  const renderInfographics = () => {
    if (!stepData) return null;

    const suggestions = stepData.infographic_suggestions || stepData.suggestions || [];

    return (
      <div className="space-y-6">
        {/* Overview */}
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-300 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl">🎨</div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Infographic Suggestions
              </h3>
              <p className="text-sm text-gray-600">
                {stepData.count || suggestions.length} visual content ideas identified
              </p>
            </div>
          </div>
        </div>

        {/* Infographic Ideas */}
        {suggestions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {suggestions.map((idea: any, index: number) => (
              <div
                key={index}
                className="bg-white border-2 border-purple-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl">
                    {getFormatIcon(idea.format || idea.recommended_format)}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-purple-600 uppercase mb-1">
                      Infographic #{index + 1}
                    </div>
                    <h4 className="text-lg font-bold text-gray-900">
                      {idea.title}
                    </h4>
                  </div>
                </div>

                {/* Description */}
                {idea.description && (
                  <p className="text-sm text-gray-700 mb-4">
                    {idea.description}
                  </p>
                )}

                {/* Format Badge */}
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                    {idea.format || idea.recommended_format || 'Chart'}
                  </span>
                </div>

                {/* Data Points */}
                {idea.data && (
                  <div className="p-4 bg-gray-50 rounded border border-gray-200 mb-4">
                    <div className="text-xs font-semibold text-gray-600 uppercase mb-2">
                      Data to Visualize
                    </div>
                    {Array.isArray(idea.data) ? (
                      <ul className="space-y-1">
                        {idea.data.map((point: string, i: number) => (
                          <li key={i} className="text-sm text-gray-700">• {point}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-700">{idea.data}</p>
                    )}
                  </div>
                )}

                {/* Design Tips */}
                {idea.design_tips && (
                  <div className="p-4 bg-blue-50 rounded border border-blue-200">
                    <div className="text-xs font-semibold text-blue-600 uppercase mb-2">
                      Design Tips
                    </div>
                    {Array.isArray(idea.design_tips) ? (
                      <ul className="space-y-1">
                        {idea.design_tips.map((tip: string, i: number) => (
                          <li key={i} className="text-xs text-gray-700">💡 {tip}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-700">{idea.design_tips}</p>
                    )}
                  </div>
                )}

                {/* Tools Suggestion */}
                {idea.tools && (
                  <div className="mt-4 text-xs text-gray-500">
                    <strong>Tools:</strong> {idea.tools}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {suggestions.length === 0 && (
          <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-gray-600">
              No infographic opportunities identified. Consider adding more data points in Step 9.
            </p>
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
        <AIOutputDisplay title="Infographic Planning Details" data={stepData} collapsible={true} />
      </div>
    );
  };

  return (
    <StepContainer
      stepNumber={15}
      stepName="Infographic Planning"
      owner="AI"
      description="AI suggests visual content ideas based on blog structure, purpose, business context, and data"
    >
      {/* Instructions */}
      <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>AI Task:</strong> Analyze the blog outline, purpose, business context, and data points
          to suggest 2 compelling infographic ideas (e.g., process diagrams, system architecture,
          data visualizations) that enhance visual appeal and shareability.
        </p>
        <p className="text-xs text-purple-600 mt-2">
          💡 AI considers the entire blog context, not just statistics. Suggestions may include
          step-by-step guides, architecture diagrams, or conceptual visualizations.
        </p>
      </div>

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={15}
          stepName="Infographic Planning"
          estimatedSeconds={30}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={15}
          stepName="Infographic Planning"
        />
      )}

      {/* Results */}
      {executionComplete && !isExecuting && stepData && (
        <div className="space-y-6">
          <SuccessBanner
            stepNumber={15}
            stepName="Infographic Planning"
            message="Generated infographic ideas based on collected data"
          />
          {renderInfographics()}
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={15}
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
