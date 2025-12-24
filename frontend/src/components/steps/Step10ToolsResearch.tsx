/**
 * Step 10: Tools Research
 * Human researches 3-5 tools/platforms to mention in the blog
 * Owner: Human
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Tool {
  name: string;
  features: string;
  url: string;
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
                    Features *
                  </label>
                  <textarea
                    value={tool.features}
                    onChange={(e) => handleToolChange(index, 'features', e.target.value)}
                    placeholder="Key features and capabilities"
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
    </StepContainer>
  );
}
