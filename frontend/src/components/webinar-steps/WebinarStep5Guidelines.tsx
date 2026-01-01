/**
 * Webinar Step 5: Content Guidelines Input
 * Human specifies what to emphasize, avoid, and tone preferences
 * Owner: Human
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import StepNavigation from '../shared/StepNavigation';
import SuccessBanner from '../shared/SuccessBanner';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface WebinarStep5Props {
  sessionId: string;
  initialData?: any;
  onStepComplete?: () => Promise<void>;
}

export default function WebinarStep5Guidelines({ sessionId, initialData, onStepComplete }: WebinarStep5Props) {
  const [emphasize, setEmphasize] = useState(initialData?.emphasize || '');
  const [avoid, setAvoid] = useState(initialData?.avoid || '');
  const [tone, setTone] = useState(initialData?.tone || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeWebinarStep5(sessionId, token, {
        emphasize: emphasize.trim() || undefined,
        avoid: avoid.trim() || undefined,
        tone: tone.trim() || undefined
      });

      if (result.success) {
        setExecutionComplete(true);
        if (onStepComplete) {
          await onStepComplete();
        }
      } else {
        setError(result.error || 'Failed to save guidelines');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
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

      await api.skipWebinarStep(5, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  const hasContent = emphasize.trim() || avoid.trim() || tone.trim();

  return (
    <StepContainer
      stepNumber={5}
      stepName="Content Guidelines Input"
      description="Specify what to emphasize, avoid, and tone preferences"
      owner="Human"
    >
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {executionComplete ? (
        <div className="space-y-4">
          <SuccessBanner
            stepNumber={5}
            stepName="Content Guidelines Input"
            message="Content guidelines saved successfully!"
          />

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">Content Guidelines</h3>

            {hasContent ? (
              <dl className="space-y-4">
                {(initialData?.emphasize || emphasize) && (
                  <div>
                    <dt className="text-sm font-medium text-purple-700">Emphasize:</dt>
                    <dd className="mt-1 text-purple-900 whitespace-pre-wrap">
                      {initialData?.emphasize || emphasize}
                    </dd>
                  </div>
                )}
                {(initialData?.avoid || avoid) && (
                  <div>
                    <dt className="text-sm font-medium text-purple-700">Avoid:</dt>
                    <dd className="mt-1 text-purple-900 whitespace-pre-wrap">
                      {initialData?.avoid || avoid}
                    </dd>
                  </div>
                )}
                {(initialData?.tone || tone) && (
                  <div>
                    <dt className="text-sm font-medium text-purple-700">Tone:</dt>
                    <dd className="mt-1 text-purple-900 whitespace-pre-wrap">
                      {initialData?.tone || tone}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-purple-700">No specific guidelines provided - AI will use default style.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">Provide Content Guidelines</h3>
            <p className="text-sm text-purple-700 mb-6">
              Help the AI understand your content preferences. All fields are optional - provide only what's important for your blog.
            </p>

            <div className="space-y-4">
              {/* Emphasize */}
              <div>
                <label htmlFor="emphasize" className="block text-sm font-medium text-gray-700 mb-2">
                  What to Emphasize <span className="text-xs text-gray-500">(optional)</span>
                </label>
                <textarea
                  id="emphasize"
                  value={emphasize}
                  onChange={(e) => setEmphasize(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="e.g., Technical implementation details, real-world use cases, ROI benefits, best practices..."
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Key points or themes the blog should highlight
                </p>
              </div>

              {/* Avoid */}
              <div>
                <label htmlFor="avoid" className="block text-sm font-medium text-gray-700 mb-2">
                  What to Avoid <span className="text-xs text-gray-500">(optional)</span>
                </label>
                <textarea
                  id="avoid"
                  value={avoid}
                  onChange={(e) => setAvoid(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="e.g., Avoid overly technical jargon, competitor mentions, pricing details, controversial topics..."
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Topics or language the blog should not include
                </p>
              </div>

              {/* Tone */}
              <div>
                <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Tone <span className="text-xs text-gray-500">(optional)</span>
                </label>
                <textarea
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="e.g., Professional but approachable, technical and authoritative, casual and conversational..."
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Describe the writing style and voice
                </p>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Guidelines'}
              </button>
            </div>
          </div>

          {/* Help text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> These guidelines are optional. If left blank, the AI will use default SEO-optimized style.
              You can skip this step if you don't have specific requirements.
            </p>
          </div>
        </div>
      )}

      <StepNavigation
        currentStep={5}
        isExecuting={isSubmitting}
        canExecute={false}
        canSkip={!isSubmitting}
        onExecute={() => {}}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
        sessionId={sessionId}
        hideNavigation={true}
      />
    </StepContainer>
  );
}
