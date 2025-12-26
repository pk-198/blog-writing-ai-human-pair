/**
 * StepNavigation - Navigation controls for workflow steps
 * Provides Execute, Skip, Previous, Next, and Save & Pause buttons
 * Includes unsaved changes warning to prevent data loss
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import UnsavedChangesDialog from './UnsavedChangesDialog';

interface StepNavigationProps {
  sessionId: string;
  currentStep: number;
  isExecuting: boolean;
  canExecute: boolean;
  canSkip: boolean;
  onExecute: () => void;
  onSkip: () => void;
  onSaveAndPause: () => void;
  executionComplete?: boolean;
  hasUnsavedChanges?: boolean; // Flag to check for unsaved edits before navigation
  isAIStep?: boolean; // Flag to show Redo button for AI steps
  onRedo?: () => void; // Callback for Redo button
  onBeforeNext?: () => Promise<boolean>; // Optional validation hook before navigating to next step
}

export default function StepNavigation({
  sessionId,
  currentStep,
  isExecuting,
  canExecute,
  canSkip,
  onExecute,
  onSkip,
  onSaveAndPause,
  executionComplete = false,
  hasUnsavedChanges = false,
  isAIStep = false,
  onRedo,
  onBeforeNext
}: StepNavigationProps) {
  const router = useRouter();
  // State for controlling unsaved changes warning dialog
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Handler for Previous button with unsaved changes check
  const handlePrevious = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      return;
    }
    if (currentStep > 1) {
      router.push(`/creator/session/${sessionId}/step/${currentStep - 1}`);
    }
  };

  // Handler for Next button with unsaved changes check
  const handleNext = async () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      return;
    }

    // Allow parent component to validate before navigation (e.g., Step 1 checking blog selection)
    if (onBeforeNext) {
      const canProceed = await onBeforeNext();
      if (!canProceed) {
        return; // Validation failed or user cancelled, block navigation
      }
    }

    if (currentStep < 22) {
      router.push(`/creator/session/${sessionId}/step/${currentStep + 1}`);
    }
  };

  // Handler for Dashboard/Complete button with unsaved changes check
  const handleDashboard = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      return;
    }
    router.push('/creator/dashboard');
  };

  // Handler for Save & Pause with unsaved changes check
  const handleSaveAndPause = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      return;
    }
    onSaveAndPause();
  };

  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 mt-6 -mx-6 -mb-6">
      <div className="max-w-5xl mx-auto">
        {/* Primary Actions */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex gap-2">
            {/* Previous Button */}
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
          </div>

          <div className="flex gap-2">
            {/* Execute Button */}
            {canExecute && !executionComplete && (
              <button
                onClick={onExecute}
                disabled={isExecuting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isExecuting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Executing...
                  </span>
                ) : (
                  'Execute Step'
                )}
              </button>
            )}

            {/* Skip Button */}
            {canSkip && !executionComplete && (
              <button
                onClick={onSkip}
                disabled={isExecuting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Skip
              </button>
            )}

            {/* Redo Button (for AI steps that are already complete) */}
            {isAIStep && executionComplete && onRedo && (
              <button
                onClick={onRedo}
                disabled={isExecuting}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                title="Re-execute this AI step with current inputs"
              >
                🔄 Redo Step
              </button>
            )}

            {/* Next Button */}
            {executionComplete && currentStep < 22 && (
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Next Step →
              </button>
            )}

            {/* Complete Button (Step 22) */}
            {executionComplete && currentStep === 22 && (
              <button
                onClick={handleDashboard}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Complete Workflow
              </button>
            )}
          </div>
        </div>

        {/* Secondary Actions */}
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={handleSaveAndPause}
            disabled={isExecuting}
            className="text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            💾 Save & Pause Session
          </button>

          <span className="text-gray-500">
            Step {currentStep} of 22
          </span>
        </div>
      </div>

      {/* Unsaved Changes Warning Dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedWarning}
        onClose={() => setShowUnsavedWarning(false)}
      />
    </div>
  );
}
