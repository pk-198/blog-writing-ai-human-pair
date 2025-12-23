/**
 * ErrorBanner - Reusable error notification component
 * Shows when a workflow step fails with retry option
 */

import React from 'react';

interface ErrorBannerProps {
  error: string;
  onRetry: () => void;
  stepNumber?: number;
  stepName?: string;
}

export default function ErrorBanner({
  error,
  onRetry,
  stepNumber,
  stepName
}: ErrorBannerProps) {
  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg animate-slideDown">
      <div className="flex items-start gap-3">
        {/* Error Icon */}
        <svg
          className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>

        <div className="flex-1">
          <h3 className="font-semibold text-red-900 mb-1">
            {stepNumber && stepName
              ? `Error in Step ${stepNumber}: ${stepName}`
              : 'Error Occurred'}
          </h3>
          <p className="text-red-700 text-sm mb-3">
            {error}
          </p>

          {/* Retry Button */}
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry Step
          </button>
        </div>
      </div>
    </div>
  );
}
