/**
 * Step 6: Blog Clustering Check
 * AI determines if blog should be clustered with existing content
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

interface Step6Props {
  sessionId: string;
  initialData?: any;
}

export default function Step6BlogClustering({ sessionId, initialData }: Step6Props) {
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

      const result = await api.executeStep6BlogClustering(sessionId, token);

      if (result.success && result.data) {
        setStepData(result.data);
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to analyze blog clustering');
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

      await api.skipStep(6, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    // Navigate back to dashboard
    window.location.href = '/creator/dashboard';
  };

  const renderClusteringResults = () => {
    if (!stepData) return null;

    const clustering = stepData.clustering_recommendation || {};
    const shouldCluster = stepData.should_cluster || clustering.should_cluster || false;
    const relatedBlogs = stepData.related_blogs || clustering.related_blogs || [];
    const clusterTopic = stepData.cluster_topic || clustering.cluster_topic || '';

    return (
      <div className="space-y-6">
        {/* Success Banner */}
        <SuccessBanner
          stepNumber={6}
          stepName="Blog Clustering"
          message={`Analyzed clustering opportunities - ${shouldCluster ? 'Clustering recommended' : 'Standalone blog recommended'}`}
        />

        {/* LLM Prompt Display */}
        <PromptDisplay
          prompt={stepData?.llm_prompt}
          title="LLM Prompt Sent to OpenAI"
        />

        {/* Recommendation Card */}
        <div
          className={`border-2 rounded-lg p-6 ${
            shouldCluster
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-300 bg-gray-50'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="text-4xl">
              {shouldCluster ? '🔗' : '📄'}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {shouldCluster ? 'Clustering Recommended' : 'Standalone Blog'}
              </h3>
              <p className="text-sm text-gray-600">
                {shouldCluster
                  ? 'This blog can be clustered with existing content'
                  : 'This blog should be published as standalone content'}
              </p>
            </div>
          </div>

          {shouldCluster && clusterTopic && (
            <div className="mt-4 p-4 bg-white rounded border border-blue-200">
              <div className="text-xs font-semibold text-blue-600 uppercase mb-1">
                Cluster Topic
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {clusterTopic}
              </div>
            </div>
          )}
        </div>

        {/* Related Blogs */}
        {shouldCluster && relatedBlogs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Related Blogs ({relatedBlogs.length})
            </h4>
            <div className="space-y-3">
              {relatedBlogs.map((blog: any, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="font-medium text-gray-900 mb-1">
                    {blog.title || blog}
                  </div>
                  {blog.summary && (
                    <p className="text-sm text-gray-600">{blog.summary}</p>
                  )}
                  {blog.relevance_score && (
                    <div className="mt-2 text-xs text-blue-600">
                      Relevance: {Math.round(blog.relevance_score * 100)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Internal Link Opportunities */}
        {clustering.internal_link_opportunities && clustering.internal_link_opportunities.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Internal Link Opportunities
            </h4>
            <ul className="space-y-2">
              {clustering.internal_link_opportunities.map((link: string, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">🔗</span>
                  <span className="text-gray-700">{link}</span>
                </li>
              ))}
            </ul>
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
        <AIOutputDisplay title="Blog Clustering Details" data={stepData} collapsible={true} />
      </div>
    );
  };

  return (
    <StepContainer
      stepNumber={6}
      stepName="Blog Clustering Check"
      owner="AI"
      description="AI determines if this blog should be clustered with existing content for better SEO and internal linking"
    >
      {/* Instructions */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>AI Task:</strong> Analyze past blogs to determine if this blog should be
          clustered with related content. Clustering helps with topical authority and internal
          linking strategy.
        </p>
      </div>

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={6}
          stepName="Blog Clustering"
          estimatedSeconds={30}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={6}
          stepName="Blog Clustering"
        />
      )}

      {/* Results */}
      {executionComplete && !isExecuting && stepData && renderClusteringResults()}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={6}
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
