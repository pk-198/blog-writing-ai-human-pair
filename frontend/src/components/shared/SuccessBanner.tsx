/**
 * SuccessBanner - Reusable success notification component
 * Shows when a workflow step completes successfully
 */

import React from 'react';

interface SuccessBannerProps {
  stepNumber: number;
  stepName: string;
  message?: string;
  showNextStepPrompt?: boolean;
}

export default function SuccessBanner({
  stepNumber,
  stepName,
  message,
  showNextStepPrompt = true
}: SuccessBannerProps) {
  return (
    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg animate-slideDown">
      <div className="flex items-center gap-2">
        {/* Checkmark Icon with animation */}
        <svg
          className="w-6 h-6 text-green-600 animate-checkmark"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <h3 className="font-semibold text-green-900">
          Step {stepNumber} Complete! {stepName}
        </h3>
      </div>
      <p className="text-sm text-green-700 mt-1">
        {message || `${stepName} finished successfully.`}
        {showNextStepPrompt && stepNumber < 22 && (
          <> Review the results below and click <strong>"Next Step"</strong> to continue.</>
        )}
        {stepNumber === 22 && (
          <> Your blog is complete! Click <strong>"Complete Workflow"</strong> to finish.</>
        )}
      </p>
    </div>
  );
}
