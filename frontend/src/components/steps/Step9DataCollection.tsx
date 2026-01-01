/**
 * Step 9: Data Collection
 * Human collects 4-5 data points with sources for credibility
 * Owner: Human
 */

'use client';

import React, { useState, useEffect } from 'react';
import StepContainer from '../shared/StepContainer';
import StepNavigation from '../shared/StepNavigation';
import PromptDisplay from '../shared/PromptDisplay';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface DataPoint {
  statistic: string;
  source: string;
}

interface DataPointIdea {
  idea: string;
  rationale: string;
}

interface ResearchPrompt {
  prompt: string;
  data_type: string;
  expected_output: string;
}

interface Step9Props {
  sessionId: string;
  initialData?: any;
}

export default function Step9DataCollection({ sessionId, initialData }: Step9Props) {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>(
    initialData?.collected_data || [{ statistic: '', source: '' }]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [error, setError] = useState<string | null>(null);

  // AI Suggestions state
  const [dataPointIdeas, setDataPointIdeas] = useState<DataPointIdea[]>([]);
  const [researchPrompts, setResearchPrompts] = useState<ResearchPrompt[]>([]);
  const [ideasCustomization, setIdeasCustomization] = useState('');
  const [promptsCustomization, setPromptsCustomization] = useState('');
  const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [ideasLlmPrompt, setIdeasLlmPrompt] = useState('');
  const [promptsLlmPrompt, setPromptsLlmPrompt] = useState('');
  const [showIdeasSection, setShowIdeasSection] = useState(false); // Collapsed by default
  const [showPromptsSection, setShowPromptsSection] = useState(true); // Expanded by default
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [promptsCopied, setPromptsCopied] = useState(0); // Track copy button clicks

  // Auto-generate suggestions on component mount
  useEffect(() => {
    if (!executionComplete) {
      handleGenerateBothSuggestions();
    }
  }, []);

  const handleGenerateBothSuggestions = async () => {
    setShowLoadingModal(true); // Show blocking modal
    setIsGeneratingIdeas(true);
    setIsGeneratingPrompts(true);
    setSuggestionsError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep9DataCollection(
        sessionId,
        [],
        token,
        false,
        '',
        'generate_suggestions',
        ideasCustomization,
        promptsCustomization
      );

      if (result.success && result.data) {
        setDataPointIdeas(result.data.data_point_ideas || []);
        setResearchPrompts(result.data.research_prompts || []);
        setIdeasLlmPrompt(result.data.llm_prompt_ideas || '');
        setPromptsLlmPrompt(result.data.llm_prompt_prompts || '');
      } else {
        setSuggestionsError(result.error || 'Failed to generate suggestions');
      }
    } catch (err: any) {
      setSuggestionsError(err.message || 'Failed to generate suggestions');
    } finally {
      setIsGeneratingIdeas(false);
      setIsGeneratingPrompts(false);
      setShowLoadingModal(false); // Hide modal when done
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setPromptsCopied(prev => prev + 1); // Track copy click
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleAddDataPoint = () => {
    setDataPoints([...dataPoints, { statistic: '', source: '' }]);
  };

  const handleRemoveDataPoint = (index: number) => {
    setDataPoints(dataPoints.filter((_, i) => i !== index));
  };

  const handleDataPointChange = (index: number, field: 'statistic' | 'source', value: string) => {
    const newDataPoints = [...dataPoints];
    newDataPoints[index][field] = value;
    setDataPoints(newDataPoints);
  };

  const handleSubmit = async (proceedWithFewer: boolean = false) => {
    // Validation
    const validDataPoints = dataPoints.filter(
      dp => dp.statistic.trim().length > 0 && dp.source.trim().length > 0
    );

    if (validDataPoints.length < 4 && !proceedWithFewer) {
      setError('Please add at least 4 data points with sources, or use "Proceed with Fewer Inputs"');
      return;
    }

    if (validDataPoints.length > 5) {
      setError('Maximum 5 data points allowed');
      return;
    }

    // If proceeding with fewer, ask for reason
    let fewerInputsReason = '';
    if (proceedWithFewer) {
      fewerInputsReason = prompt('Why are you proceeding with fewer than 4 data points? (e.g., "Limited research available on niche topic")') || '';
      if (!fewerInputsReason) return; // User cancelled
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep9DataCollection(
        sessionId,
        validDataPoints,
        token,
        proceedWithFewer,
        fewerInputsReason,
        'collect',
        '',
        '',
        promptsCopied
      );

      if (result.success) {
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to save data points');
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

      await api.skipStep(9, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  const validCount = dataPoints.filter(
    dp => dp.statistic.trim().length > 0 && dp.source.trim().length > 0
  ).length;

  return (
    <StepContainer
      stepNumber={9}
      stepName="Data Collection"
      owner="Human"
      description="Collect 7-8 credible data points with proper sources to add authority and trustworthiness to your blog content."
    >
      {/* Instructions */}
      {!executionComplete && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-2">Your Task:</h3>
          <ul className="list-disc list-inside text-green-800 space-y-1 text-sm">
            <li>Research and collect 7-8 relevant statistics, facts, or data points</li>
            <li>Include proper source attribution for each data point</li>
            <li>Use credible sources: research papers, industry reports, government data</li>
            <li>Data should support key points in your blog outline</li>
          </ul>
          <div className="mt-3 p-3 bg-green-100 rounded text-sm text-green-900">
            <strong>Example:</strong> "87% of marketers use content marketing" - Source: Content Marketing Institute 2023
          </div>
        </div>
      )}

      {/* AI Suggestions - Data Point Ideas */}
      {!executionComplete && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg">
          <div
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => setShowIdeasSection(!showIdeasSection)}
          >
            <div>
              <h3 className="font-semibold text-blue-900">
                💡 AI Suggestions: Data Point Ideas ({dataPointIdeas.length})
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Broad ideas about what kinds of data points to look for
              </p>
            </div>
            <button className="text-blue-900 text-xl">
              {showIdeasSection ? '−' : '+'}
            </button>
          </div>

          {showIdeasSection && (
            <div className="px-4 pb-4 space-y-4">
              {/* Customization Input */}
              <div>
                <label className="block text-sm font-medium text-blue-900 mb-2">
                  Customize Suggestions (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ideasCustomization}
                    onChange={(e) => setIdeasCustomization(e.target.value)}
                    placeholder="e.g., Do not suggest performance benchmarks"
                    className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={handleGenerateBothSuggestions}
                    disabled={isGeneratingIdeas}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    {isGeneratingIdeas ? '⏳ Generating...' : '🔄 Regenerate'}
                  </button>
                </div>
              </div>

              {/* Ideas List */}
              {dataPointIdeas.length > 0 && (
                <div className="space-y-3">
                  {dataPointIdeas.map((idea, index) => (
                    <div key={index} className="bg-white border border-blue-300 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded shrink-0">
                          #{index + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium">{idea.idea}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Why:</span> {idea.rationale}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* LLM Prompt Display */}
              {ideasLlmPrompt && (
                <PromptDisplay prompt={ideasLlmPrompt} title="LLM Prompt for Data Point Ideas" />
              )}
            </div>
          )}
        </div>
      )}

      {/* AI Suggestions - Research Prompts */}
      {!executionComplete && (
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg">
          <div
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => setShowPromptsSection(!showPromptsSection)}
          >
            <div>
              <h3 className="font-semibold text-purple-900">
                🔍 AI Suggestions: Perplexity Prompts For Data Research ({researchPrompts.length})
              </h3>
              <p className="text-sm text-purple-700 mt-1">
                Ready-to-use prompts for LLM research assistants for finding data using perplexity like research
              </p>
            </div>
            <button className="text-purple-900 text-xl">
              {showPromptsSection ? '−' : '+'}
            </button>
          </div>

          {showPromptsSection && (
            <div className="px-4 pb-4 space-y-4">
              {/* Customization Input */}
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-2">
                  Customize Prompts (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promptsCustomization}
                    onChange={(e) => setPromptsCustomization(e.target.value)}
                    placeholder="e.g., Focus on 2024-2025 data only"
                    className="flex-1 px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={handleGenerateBothSuggestions}
                    disabled={isGeneratingPrompts}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium whitespace-nowrap"
                  >
                    {isGeneratingPrompts ? '⏳ Generating...' : '🔄 Regenerate'}
                  </button>
                </div>
              </div>

              {/* Prompts List */}
              {researchPrompts.length > 0 && (
                <div className="space-y-3">
                  {researchPrompts.map((prompt, index) => (
                    <div key={index} className="bg-white border border-purple-300 rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded shrink-0">
                            #{index + 1}
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-purple-200 text-purple-900 text-xs rounded">
                                {prompt.data_type}
                              </span>
                            </div>
                            <p className="text-gray-900">{prompt.prompt}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              <span className="font-medium">Expected:</span> {prompt.expected_output}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(prompt.prompt)}
                          className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors text-xs font-medium shrink-0"
                          title="Copy to clipboard"
                        >
                          📋 Copy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* LLM Prompt Display */}
              {promptsLlmPrompt && (
                <PromptDisplay prompt={promptsLlmPrompt} title="LLM Prompt for Research Prompts" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Suggestions Error */}
      {suggestionsError && !executionComplete && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{suggestionsError}</p>
        </div>
      )}

      {/* Data Point Input Form */}
      {!executionComplete && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Data Points ({validCount}/7-8)
            </h3>
            <button
              onClick={handleAddDataPoint}
              disabled={dataPoints.length >= 5}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              + Add Data Point
            </button>
          </div>

          {/* Data Point Cards */}
          <div className="space-y-4">
            {dataPoints.map((dataPoint, index) => (
              <div key={index} className="bg-white border border-gray-300 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-gray-900">Data Point {index + 1}</h4>
                  {dataPoints.length > 1 && (
                    <button
                      onClick={() => handleRemoveDataPoint(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Statistic / Fact *
                    </label>
                    <textarea
                      value={dataPoint.statistic}
                      onChange={(e) => handleDataPointChange(index, 'statistic', e.target.value)}
                      placeholder="e.g., 87% of marketers use content marketing to attract customers"
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source / Citation *
                    </label>
                    <input
                      type="text"
                      value={dataPoint.source}
                      onChange={(e) => handleDataPointChange(index, 'source', e.target.value)}
                      placeholder="e.g., Content Marketing Institute 2023 Annual Report"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Validation Message */}
          {validCount < 4 && (
            <p className="text-sm text-gray-600">
              Provide 7-8 data points if possible. Else add atleast {4 - validCount} more data {4 - validCount === 1 ? 'point' : 'points'} to meet the minimum requirement
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
              disabled={isSubmitting || validCount < 4}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSubmitting ? 'Saving Data Points...' : 'Save Data Points & Continue'}
            </button>

            {/* Proceed with Fewer Inputs Button (only show if less than minimum) */}
            {validCount > 0 && validCount < 4 && (
              <button
                onClick={handleProceedWithFewer}
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                title="Proceed with fewer than 4 data points (requires justification)"
              >
                ⚠️ Proceed with {validCount} Data {validCount === 1 ? 'Point' : 'Points'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Completion State */}
      {executionComplete && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-3">Data Points Saved</h3>
            <div className="space-y-3">
              {dataPoints
                .filter(dp => dp.statistic.trim().length > 0 && dp.source.trim().length > 0)
                .map((dataPoint, index) => (
                  <div key={index} className="bg-white border border-green-300 rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded">
                        #{index + 1}
                      </span>
                      <p className="text-gray-900 flex-1">{dataPoint.statistic}</p>
                    </div>
                    <p className="text-sm text-gray-600 ml-10">
                      <span className="font-medium">Source:</span> {dataPoint.source}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={9}
        isExecuting={isSubmitting}
        canExecute={false}
        canSkip={!executionComplete}
        onExecute={() => {}}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
      />

      {/* Loading Modal - Blocks UI while generating AI suggestions */}
      {showLoadingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="mb-4">
              {/* Hourglass Animation */}
              <div className="inline-block text-6xl animate-spin">⏳</div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Generating AI Suggestions
            </h3>
            <p className="text-gray-600">
              Please wait while we generate data point ideas and data research prompts based on your blog outline...
            </p>
            <div className="mt-4 text-sm text-gray-500">
              This may take 10-30 seconds
            </div>
          </div>
        </div>
      )}
    </StepContainer>
  );
}
