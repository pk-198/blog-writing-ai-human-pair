/**
 * Step 10: Tools Research
 * Human researches 3-5 tools/platforms to mention in the blog
 * Owner: Human
 */

'use client';

import React, { useState, useEffect } from 'react';
import StepContainer from '../shared/StepContainer';
import StepNavigation from '../shared/StepNavigation';
import PromptDisplay from '../shared/PromptDisplay';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Tool {
  name: string;
  features: string;
  url: string;
}

interface ToolSuggestion {
  tool_name: string;
  what_to_look_for: string[];
}

interface Step10Props {
  sessionId: string;
  initialData?: any;
}

export default function Step10ToolsResearch({ sessionId, initialData }: Step10Props) {
  const [tools, setTools] = useState<Tool[]>(
    initialData?.tools || [{ name: '', features: '', url: '' }]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [error, setError] = useState<string | null>(null);

  // AI Suggestions state
  const [toolSuggestions, setToolSuggestions] = useState<ToolSuggestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestionsLlmPrompt, setSuggestionsLlmPrompt] = useState('');
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [showSuggestionsSection, setShowSuggestionsSection] = useState(true);
  const [showLoadingModal, setShowLoadingModal] = useState(false);

  // Auto-generate tool suggestions on component mount
  useEffect(() => {
    if (!executionComplete) {
      handleGenerateToolSuggestions();
    }
  }, []);

  const handleGenerateToolSuggestions = async () => {
    setShowLoadingModal(true);
    setIsGeneratingSuggestions(true);
    setSuggestionsError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep10ToolsResearch(
        sessionId,
        [],
        token,
        false,
        '',
        'generate_suggestions',
        ''
      );

      if (result.success && result.data) {
        setToolSuggestions(result.data.tool_suggestions || []);
        setSuggestionsLlmPrompt(result.data.llm_prompt || '');
      } else {
        setSuggestionsError(result.error || 'Failed to generate tool suggestions');
      }
    } catch (err: any) {
      setSuggestionsError(err.message || 'Failed to generate tool suggestions');
    } finally {
      setIsGeneratingSuggestions(false);
      setShowLoadingModal(false);
    }
  };

  const handleAddTool = () => {
    if (tools.length >= 5) {
      setError('Maximum 5 tools allowed');
      return;
    }
    setTools([...tools, { name: '', features: '', url: '' }]);
  };

  const handleRemoveTool = (index: number) => {
    setTools(tools.filter((_, i) => i !== index));
  };

  const handleToolChange = (index: number, field: keyof Tool, value: string) => {
    const newTools = [...tools];
    newTools[index][field] = value;
    setTools(newTools);
  };

  const handleSubmit = async (proceedWithFewer: boolean = false) => {
    // Validation
    const validTools = tools.filter(
      tool => tool.name.trim() && tool.features.trim() && tool.url.trim()
    );

    if (validTools.length < 3 && !proceedWithFewer) {
      setError('Please add at least 3 tools with complete information, or use "Proceed with Fewer Inputs"');
      return;
    }

    if (validTools.length > 5) {
      setError('Maximum 5 tools allowed');
      return;
    }

    // If proceeding with fewer, ask for reason
    let fewerInputsReason = '';
    if (proceedWithFewer) {
      fewerInputsReason = prompt('Why are you proceeding with fewer than 3 tools? (e.g., "Limited relevant tools available for this niche topic")') || '';
      if (!fewerInputsReason) return; // User cancelled
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep10ToolsResearch(
        sessionId,
        validTools,
        token,
        proceedWithFewer,
        fewerInputsReason
      );

      if (result.success) {
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to save tools');
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
    const reason = prompt('Why are you skipping this step? (e.g., "Not a tools-focused blog")');
    if (!reason) return;

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      await api.skipStep(10, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    // Navigate back to dashboard
    window.location.href = '/creator/dashboard';
  };

  const validCount = tools.filter(
    tool => tool.name.trim() && tool.features.trim() && tool.url.trim()
  ).length;

  return (
    <StepContainer
      stepNumber={10}
      stepName="Tools Research"
      owner="Human"
      description="Research 3-5 tools/platforms relevant to this blog topic"
    >
      {/* Instructions */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-gray-700 mb-2">
          <strong>Your Task:</strong> Research and document 3-5 tools, platforms, or software
          solutions that are relevant to this blog topic.
        </p>
        <p className="text-xs text-gray-600">
          💡 For each tool, provide the name, key features, and official URL. This step can be
          skipped if the blog is not tools-focused.
        </p>
      </div>

      {/* AI Tool Suggestions */}
      {!executionComplete && (
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg">
          <div
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => setShowSuggestionsSection(!showSuggestionsSection)}
          >
            <div>
              <h3 className="font-semibold text-purple-900">
                🛠️ AI Tool Suggestions For Researching ({toolSuggestions.length})
              </h3>
              <p className="text-sm text-purple-700 mt-1">
                Research these recommended tools for building voice agents (Note: new tools may have come up too & these may be outdated)
              </p>
            </div>
            <button className="text-purple-900 text-xl">
              {showSuggestionsSection ? '−' : '+'}
            </button>
          </div>

          {showSuggestionsSection && (
            <div className="px-4 pb-4 space-y-4">
              {/* Tool Suggestions List */}
              {toolSuggestions.length > 0 && (
                <div className="space-y-3">
                  {toolSuggestions.map((tool, index) => (
                    <div key={index} className="bg-white border border-purple-300 rounded-lg p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded shrink-0">
                          #{index + 1}
                        </span>
                        <h4 className="font-semibold text-gray-900">{tool.tool_name}</h4>
                      </div>
                      <div className="ml-8">
                        <p className="text-sm font-medium text-gray-700 mb-2">What to look for:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {tool.what_to_look_for.map((point, pointIndex) => (
                            <li key={pointIndex} className="text-sm text-gray-600">{point}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* LLM Prompt Display */}
              {suggestionsLlmPrompt && (
                <PromptDisplay prompt={suggestionsLlmPrompt} title="LLM Prompt for Tool Suggestions" />
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

      {executionComplete ? (
        /* Completion State */
        <div className="space-y-6">
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✓</span>
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  Step Completed
                </h3>
                <p className="text-sm text-green-700">
                  {initialData?.tools?.length
                    ? `${initialData.tools.length} tools documented`
                    : 'Tools research complete'}
                </p>
              </div>
            </div>
          </div>

          {initialData?.tools && initialData.tools.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">
                Tools Documented ({initialData.tools.length})
              </h4>
              <div className="space-y-4">
                {initialData.tools.map((tool: Tool, index: number) => (
                  <div key={index} className="p-4 bg-gray-50 rounded border border-gray-200">
                    <div className="font-medium text-gray-900 mb-1">{tool.name}</div>
                    <p className="text-sm text-gray-600 mb-2">{tool.features}</p>
                    <a
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {tool.url}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Input Form */
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {tools.map((tool, index) => (
              <div
                key={index}
                className="p-5 bg-white border-2 border-gray-200 rounded-lg relative"
              >
                {/* Remove Button */}
                {tools.length > 1 && (
                  <button
                    onClick={() => handleRemoveTool(index)}
                    className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕ Remove
                  </button>
                )}

                <div className="text-sm font-semibold text-gray-700 mb-3">
                  Tool #{index + 1}
                </div>

                {/* Tool Name */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tool Name *
                  </label>
                  <input
                    type="text"
                    value={tool.name}
                    onChange={(e) => handleToolChange(index, 'name', e.target.value)}
                    placeholder="e.g., Ahrefs"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Features */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Notes/Features etc *
                  </label>
                  <textarea
                    value={tool.features}
                    onChange={(e) => handleToolChange(index, 'features', e.target.value)}
                    placeholder="Reviews or Any Notes or Key features or capabilities etc"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* URL */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Official URL *
                  </label>
                  <input
                    type="url"
                    value={tool.url}
                    onChange={(e) => handleToolChange(index, 'url', e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Tool Button */}
          {tools.length < 5 && (
            <button
              onClick={handleAddTool}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              + Add Another Tool
            </button>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || validCount < 3}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Tools'}
            </button>

            {/* Proceed with Fewer Inputs Button (only show if less than minimum) */}
            {validCount > 0 && validCount < 3 && (
              <button
                onClick={handleProceedWithFewer}
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                title="Proceed with fewer than 3 tools (requires justification)"
              >
                ⚠️ Proceed with {validCount} {validCount === 1 ? 'Tool' : 'Tools'}
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center">
            Add 3-5 tools • Required: Name, Features, URL
          </p>
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={10}
        isExecuting={isSubmitting}
        canExecute={!executionComplete}
        canSkip={!executionComplete}
        onExecute={handleSubmit}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
      />

      {/* Loading Modal - Blocks UI while generating AI suggestions */}
      {showLoadingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <div className="mb-4">
              <div className="inline-block text-6xl animate-spin">⏳</div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Generating Tool Suggestions
            </h3>
            <p className="text-gray-600">
              Please wait while we generate relevant tool suggestions for building voice agents...
            </p>
            <div className="mt-4 text-sm text-gray-500">
              This may take 10-20 seconds
            </div>
          </div>
        </div>
      )}
    </StepContainer>
  );
}
