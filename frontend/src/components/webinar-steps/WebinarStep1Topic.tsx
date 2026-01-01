/**
 * Webinar Step 1: Topic Input
 * Human enters webinar topic, guest information, and target audience
 * Owner: Human
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import StepNavigation from '../shared/StepNavigation';
import SuccessBanner from '../shared/SuccessBanner';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface WebinarStep1Props {
  sessionId: string;
  initialData?: any;
  onStepComplete?: () => Promise<void>;
}

export default function WebinarStep1Topic({ sessionId, initialData, onStepComplete }: WebinarStep1Props) {
  const [webinarTopic, setWebinarTopic] = useState(initialData?.webinar_topic || '');
  const [guestName, setGuestName] = useState(initialData?.guest_name || '');
  const [guestCredentials, setGuestCredentials] = useState(initialData?.guest_credentials || '');
  const [targetAudience, setTargetAudience] = useState(initialData?.target_audience || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validation
    if (!webinarTopic.trim()) {
      setError('Webinar topic is required');
      return;
    }

    if (webinarTopic.trim().length < 10) {
      setError('Webinar topic must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeWebinarStep1(sessionId, token, {
        webinar_topic: webinarTopic.trim(),
        guest_name: guestName.trim() || undefined,
        guest_credentials: guestCredentials.trim() || undefined,
        target_audience: targetAudience.trim() || undefined
      });

      if (result.success) {
        setExecutionComplete(true);
        if (onStepComplete) {
          await onStepComplete();
        }
      } else {
        setError(result.error || 'Failed to save webinar topic');
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

      await api.skipWebinarStep(1, { session_id: sessionId, reason }, token);
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
      stepNumber={1}
      stepName="Webinar Topic Input"
      description="Enter webinar topic, guest information, and target audience"
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
            stepNumber={1}
            stepName="Webinar Topic Input"
            message="Webinar topic information saved successfully!"
          />

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">Webinar Details</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-purple-700">Topic:</dt>
                <dd className="mt-1 text-purple-900">{initialData?.webinar_topic || webinarTopic}</dd>
              </div>
              {(initialData?.guest_name || guestName) && (
                <div>
                  <dt className="text-sm font-medium text-purple-700">Guest:</dt>
                  <dd className="mt-1 text-purple-900">{initialData?.guest_name || guestName}</dd>
                </div>
              )}
              {(initialData?.guest_credentials || guestCredentials) && (
                <div>
                  <dt className="text-sm font-medium text-purple-700">Credentials:</dt>
                  <dd className="mt-1 text-purple-900">{initialData?.guest_credentials || guestCredentials}</dd>
                </div>
              )}
              {(initialData?.target_audience || targetAudience) && (
                <div>
                  <dt className="text-sm font-medium text-purple-700">Target Audience:</dt>
                  <dd className="mt-1 text-purple-900">{initialData?.target_audience || targetAudience}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-purple-900 mb-4">Enter Webinar Details</h3>
            <p className="text-sm text-purple-700 mb-6">
              Provide information about your webinar or podcast to help create an SEO-optimized blog post.
            </p>

            <div className="space-y-4">
              {/* Webinar Topic */}
              <div>
                <label htmlFor="webinarTopic" className="block text-sm font-medium text-gray-700 mb-2">
                  Webinar Topic * <span className="text-xs text-gray-500">(min 10 characters)</span>
                </label>
                <input
                  type="text"
                  id="webinarTopic"
                  value={webinarTopic}
                  onChange={(e) => setWebinarTopic(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="e.g., Building AI Calling Agents with Voice AI"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Character count: {webinarTopic.length}
                </p>
              </div>

              {/* Guest Name */}
              <div>
                <label htmlFor="guestName" className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Name <span className="text-xs text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="e.g., John Doe"
                  disabled={isSubmitting}
                />
              </div>

              {/* Guest Credentials */}
              <div>
                <label htmlFor="guestCredentials" className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Credentials <span className="text-xs text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  id="guestCredentials"
                  value={guestCredentials}
                  onChange={(e) => setGuestCredentials(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="e.g., CEO at VoiceAI Inc, AI Expert"
                  disabled={isSubmitting}
                />
              </div>

              {/* Target Audience */}
              <div>
                <label htmlFor="targetAudience" className="block text-sm font-medium text-gray-700 mb-2">
                  Target Audience <span className="text-xs text-gray-500">(optional)</span>
                </label>
                <input
                  type="text"
                  id="targetAudience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  placeholder="e.g., developers, CTOs, product managers"
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || webinarTopic.trim().length < 10}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Webinar Details'}
              </button>
            </div>
          </div>
        </div>
      )}

      <StepNavigation
        currentStep={1}
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
