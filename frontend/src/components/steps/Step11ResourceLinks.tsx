/**
 * Step 11: Resource Links Collection
 * Human adds 5-7 external resource links (YouTube, Reddit, Quora, research papers)
 * Owner: Human
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface Resource {
  title: string;
  url: string;
  description: string;
  type?: string;
}

interface Step11Props {
  sessionId: string;
  initialData?: any;
}

export default function Step11ResourceLinks({ sessionId, initialData }: Step11Props) {
  const [resources, setResources] = useState<Resource[]>(
    initialData?.resources || [{ title: '', url: '', description: '', type: '' }]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [error, setError] = useState<string | null>(null);

  const detectLinkType = (url: string): string => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('youtube')) return 'youtube';
    if (lowerUrl.includes('reddit')) return 'reddit';
    if (lowerUrl.includes('quora')) return 'quora';
    if (lowerUrl.includes('.pdf') || lowerUrl.includes('arxiv') || lowerUrl.includes('scholar')) {
      return 'research_paper';
    }
    return 'article';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'youtube':
        return '📺';
      case 'reddit':
        return '🗨️';
      case 'quora':
        return '❓';
      case 'research_paper':
        return '📄';
      default:
        return '🔗';
    }
  };

  const handleAddResource = () => {
    if (resources.length >= 7) {
      setError('Maximum 7 resource links allowed');
      return;
    }
    setResources([...resources, { title: '', url: '', description: '', type: '' }]);
  };

  const handleRemoveResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index));
  };

  const handleResourceChange = (index: number, field: keyof Resource, value: string) => {
    const newResources = [...resources];
    newResources[index][field] = value;

    // Auto-detect type when URL changes
    if (field === 'url') {
      newResources[index].type = detectLinkType(value);
    }

    setResources(newResources);
  };

  const handleSubmit = async (proceedWithFewer: boolean = false) => {
    // Validation
    const validResources = resources.filter(
      resource => resource.title.trim() && resource.url.trim() && resource.description.trim()
    );

    if (validResources.length < 5 && !proceedWithFewer) {
      setError('Please add at least 5 resource links, or use "Proceed with Fewer Inputs"');
      return;
    }

    if (validResources.length > 7) {
      setError('Maximum 7 resource links allowed');
      return;
    }

    // If proceeding with fewer, ask for reason
    let fewerInputsReason = '';
    if (proceedWithFewer) {
      fewerInputsReason = prompt('Why are you proceeding with fewer than 5 resource links? (e.g., "Limited credible external resources available for this niche topic")') || '';
      if (!fewerInputsReason) return; // User cancelled
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep11ResourceLinks(
        sessionId,
        validResources,
        token,
        proceedWithFewer,
        fewerInputsReason
      );

      if (result.success) {
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to save resources');
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

      await api.skipStep(11, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    // Navigate back to dashboard
    window.location.href = '/creator/dashboard';
  };

  const validCount = resources.filter(
    resource => resource.title.trim() && resource.url.trim() && resource.description.trim()
  ).length;

  return (
    <StepContainer
      stepNumber={11}
      stepName="Resource Links Collection"
      owner="Human"
      description="Curate 5-7 credible external resource links for additional context"
    >
      {/* Instructions */}
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-gray-700 mb-2">
          <strong>Your Task:</strong> Add 5-7 high-quality external resource links that provide
          additional value to readers (YouTube videos, Reddit discussions, Quora answers, research
          papers, articles).
        </p>
        <p className="text-xs text-gray-600">
          💡 Prioritize authoritative sources. Mix different types of content for variety.
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
                  {initialData?.total_count || initialData?.resources?.length || 0} resource links collected
                </p>
              </div>
            </div>
          </div>

          {initialData?.categorized && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-4">
                Resource Links by Category
              </h4>
              <div className="space-y-4">
                {Object.entries(initialData.categorized).map(([category, links]: [string, any]) => {
                  if (!Array.isArray(links) || links.length === 0) return null;
                  return (
                    <div key={category} className="p-4 bg-gray-50 rounded">
                      <div className="font-medium text-gray-900 mb-2 capitalize">
                        {category.replace('_', ' ')} ({links.length})
                      </div>
                      <div className="space-y-2">
                        {links.map((link: Resource, index: number) => (
                          <div key={index} className="flex items-start gap-2">
                            <span>{getTypeIcon(category)}</span>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{link.title}</div>
                              {link.description && (
                                <div className="text-xs text-gray-600 mt-1">{link.description}</div>
                              )}
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 break-all"
                              >
                                {link.url}
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
            {resources.map((resource, index) => (
              <div
                key={index}
                className="p-5 bg-white border-2 border-gray-200 rounded-lg relative"
              >
                {/* Type Icon */}
                <div className="absolute top-3 left-3 text-2xl">
                  {getTypeIcon(resource.type || '')}
                </div>

                {/* Remove Button */}
                {resources.length > 1 && (
                  <button
                    onClick={() => handleRemoveResource(index)}
                    className="absolute top-3 right-3 text-red-500 hover:text-red-700 text-sm"
                  >
                    ✕ Remove
                  </button>
                )}

                <div className="pl-10">
                  <div className="text-sm font-semibold text-gray-700 mb-3">
                    Resource #{index + 1}
                  </div>

                  {/* Title */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={resource.title}
                      onChange={(e) => handleResourceChange(index, 'title', e.target.value)}
                      placeholder="e.g., Comprehensive guide to X on YouTube"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      value={resource.description}
                      onChange={(e) => handleResourceChange(index, 'description', e.target.value)}
                      placeholder="Brief description of what this resource covers"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* URL */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      URL *
                    </label>
                    <input
                      type="url"
                      value={resource.url}
                      onChange={(e) => handleResourceChange(index, 'url', e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Auto-detected Type */}
                  {resource.type && (
                    <div className="mt-2 text-xs text-gray-500">
                      Type: <span className="font-medium capitalize">{resource.type.replace('_', ' ')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Resource Button */}
          {resources.length < 7 && (
            <button
              onClick={handleAddResource}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              + Add Another Resource
            </button>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || validCount < 5}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save Resources'}
            </button>

            {/* Proceed with Fewer Inputs Button (only show if less than minimum) */}
            {validCount > 0 && validCount < 5 && (
              <button
                onClick={handleProceedWithFewer}
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                title="Proceed with fewer than 5 resource links (requires justification)"
              >
                ⚠️ Proceed with {validCount} {validCount === 1 ? 'Resource' : 'Resources'}
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500 text-center">
            Add 5-7 resources • Mix of YouTube, Reddit, Quora, articles, and research papers
          </p>
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={11}
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
