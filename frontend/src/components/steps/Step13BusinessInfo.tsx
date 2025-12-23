/**
 * Step 13: Business Info Update
 * Human reviews and edits business context file (dograh.txt)
 * Owner: Human
 * Includes unsaved changes detection with browser navigation warning
 */

'use client';

import React, { useState, useEffect } from 'react';
import StepContainer from '../shared/StepContainer';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

interface Step13Props {
  sessionId: string;
  initialData?: any;
}

export default function Step13BusinessInfo({ sessionId, initialData }: Step13Props) {
  // Business info editor state
  const [businessInfoContent, setBusinessInfoContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Step completion state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [error, setError] = useState<string | null>(null);

  // Unsaved changes tracking with browser navigation warning
  const { setHasUnsavedChanges } = useUnsavedChanges();

  // Calculate if there are unsaved changes
  const hasUnsavedChanges = businessInfoContent !== originalContent;

  // Sync unsaved changes state with the hook for browser navigation warning
  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  // Load business info on mount or when initialData changes
  useEffect(() => {
    if (initialData?.business_info_file_content) {
      const content = initialData.business_info_file_content;
      setBusinessInfoContent(content);
      setOriginalContent(content);
    }
  }, [initialData]);

  // Load business info when step is first loaded
  useEffect(() => {
    const loadBusinessInfo = async () => {
      if (!executionComplete && !businessInfoContent) {
        try {
          const token = getToken();
          if (!token) return;

          // Execute step to load business info
          const result = await api.executeStep13BusinessInfo(
            sessionId,
            { new_info: '' },
            token
          );

          if (result.success && result.data?.business_info_file_content) {
            const content = result.data.business_info_file_content;
            setBusinessInfoContent(content);
            setOriginalContent(content);
          }
        } catch (err: any) {
          console.error('Failed to load business info:', err);
        }
      }
    };

    loadBusinessInfo();
  }, [sessionId, executionComplete, businessInfoContent]);

  const handleSaveBusinessInfo = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      await api.saveBusinessInfo(businessInfoContent, token);

      setOriginalContent(businessInfoContent);
      setSaveSuccess(true);
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save business info');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setBusinessInfoContent(originalContent);
    setIsEditing(false);
    setSaveError(null);
  };

  const handleContinue = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep13BusinessInfo(
        sessionId,
        { new_info: '' },
        token
      );

      if (result.success) {
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Failed to complete step');
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

      await api.skipStep(13, { session_id: sessionId, reason }, token);
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
      stepNumber={13}
      stepName="Business Info Review & Edit"
      owner="Human"
      description="Review and edit your business context file (dograh.txt). Keep information up-to-date as your business evolves."
    >
      {/* Instructions */}
      {!executionComplete && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">What to do:</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
            <li>Review your business information below</li>
            <li>Click "Edit" to make changes if information is outdated</li>
            <li>Update any outdated services, products, team info, or company details</li>
            <li>Click "Save Business Info" to save your changes</li>
            <li>Click "Continue to Next Step" when ready to proceed</li>
          </ul>
          <p className="text-xs text-blue-700 mt-3">
            💡 <strong>Tip:</strong> This information helps AI understand your business for better blog personalization.
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Save Success Message */}
      {saveSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-xl">✓</span>
            <p className="text-green-800 font-medium">Business info saved successfully!</p>
          </div>
        </div>
      )}

      {/* Save Error Message */}
      {saveError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{saveError}</p>
        </div>
      )}

      {/* Completion State */}
      {executionComplete ? (
        <div className="space-y-6">
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">✓</span>
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  Step Completed
                </h3>
                <p className="text-sm text-green-700">
                  Business context reviewed and confirmed
                </p>
              </div>
            </div>
          </div>

          {/* Show current business context (read-only) */}
          {businessInfoContent && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="font-semibold text-gray-900 mb-3">
                Current Business Context
              </h4>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                  {businessInfoContent}
                </pre>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {businessInfoContent.length} characters
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Editor / Review State */
        <div className="space-y-6">
          {/* Business Info Editor */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-gray-900 text-lg">
                Business Information (dograh.txt)
              </h4>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
                >
                  ✏️ Edit
                </button>
              )}
            </div>

            {isEditing ? (
              /* Edit Mode */
              <div className="space-y-4">
                <textarea
                  value={businessInfoContent}
                  onChange={(e) => setBusinessInfoContent(e.target.value)}
                  rows={20}
                  className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  placeholder="Enter your business information here..."
                />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    {businessInfoContent.length} characters
                    {hasUnsavedChanges && (
                      <span className="ml-2 text-orange-600 font-medium">
                        • Unsaved changes
                      </span>
                    )}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveBusinessInfo}
                      disabled={isSaving || !hasUnsavedChanges}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : '💾 Save Business Info'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                    {businessInfoContent || 'Loading business information...'}
                  </pre>
                </div>
                <p className="text-xs text-gray-500">
                  {businessInfoContent.length} characters • Click "Edit" to make changes
                </p>
              </div>
            )}
          </div>

          {/* Unsaved Changes Warning */}
          {hasUnsavedChanges && !isEditing && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-yellow-600 text-xl">⚠️</span>
                <p className="text-yellow-800 font-medium">
                  You have unsaved changes. Click "Edit" and then "Save Business Info" to save them.
                </p>
              </div>
            </div>
          )}

          {/* Continue Button */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-3">Ready to Continue?</h4>
            <p className="text-sm text-gray-700 mb-4">
              Make sure you've reviewed (and saved if needed) your business information before proceeding to the next step.
            </p>
            <button
              onClick={handleContinue}
              disabled={isSubmitting || hasUnsavedChanges}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Continue to Next Step →'}
            </button>
            {hasUnsavedChanges && (
              <p className="text-xs text-orange-600 mt-2 text-center">
                Please save your changes before continuing
              </p>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={13}
        isExecuting={isSubmitting}
        canExecute={false} // Using custom continue button instead
        canSkip={!executionComplete}
        onExecute={handleContinue}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </StepContainer>
  );
}
