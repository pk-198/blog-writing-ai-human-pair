/**
 * SimplifiedStepCard - Displays a single workflow step (simplified for creators, without plagiarism)
 */
'use client';

import { useState, useEffect } from 'react';

interface StepData {
  step_number: number;
  step_name: string;
  owner: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  data: any;
  skipped: boolean;
  skip_reason?: string;
}

interface SimplifiedStepCardProps {
  step: StepData;
  forceExpanded?: boolean;
}

export default function SimplifiedStepCard({ step, forceExpanded }: SimplifiedStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  // Sync with forceExpanded prop when it changes
  useEffect(() => {
    if (forceExpanded !== undefined) {
      setIsExpanded(forceExpanded);
    }
  }, [forceExpanded]);

  const getOwnerBadgeColor = (owner: string) => {
    switch (owner) {
      case 'AI':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Human':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'AI+Human':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'skipped':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'pending':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const renderDataPreview = () => {
    if (!step.data || Object.keys(step.data).length === 0) {
      return <div className="text-gray-500 italic">No data available</div>;
    }

    if (showRawData) {
      return (
        <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
          {JSON.stringify(step.data, null, 2)}
        </pre>
      );
    }

    // Show a brief summary of the data
    return (
      <div className="bg-gray-50 p-4 rounded-lg space-y-2">
        {Object.entries(step.data).slice(0, 5).map(([key, value]) => (
          <div key={key} className="text-sm">
            <span className="font-medium text-gray-700">{key}:</span>{' '}
            <span className="text-gray-600">
              {typeof value === 'object'
                ? JSON.stringify(value).substring(0, 100) + '...'
                : String(value).substring(0, 100)}
            </span>
          </div>
        ))}
        {Object.keys(step.data).length > 5 && (
          <div className="text-xs text-gray-500 italic">
            ... and {Object.keys(step.data).length - 5} more fields
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      {/* Card Header - Always Visible */}
      <div
        className="p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Step Title and Badges */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900">
                Step {step.step_number}: {step.step_name}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getOwnerBadgeColor(
                  step.owner
                )}`}
              >
                {step.owner}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeColor(
                  step.status
                )}`}
              >
                {step.status.toUpperCase()}
              </span>
              {step.skipped && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">
                  SKIPPED
                </span>
              )}
            </div>

            {/* Metadata Row */}
            <div className="flex items-center gap-6 text-sm text-gray-600 flex-wrap">
              {step.started_at && (
                <div>
                  <span className="font-medium">Started:</span>{' '}
                  {formatDate(step.started_at)}
                </div>
              )}
              {step.completed_at && (
                <div>
                  <span className="font-medium">Completed:</span>{' '}
                  {formatDate(step.completed_at)}
                </div>
              )}
              {step.duration_seconds !== undefined && (
                <div>
                  <span className="font-medium">Duration:</span>{' '}
                  {formatDuration(step.duration_seconds)}
                </div>
              )}
            </div>

            {/* Skip Reason */}
            {step.skipped && step.skip_reason && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="font-medium text-yellow-800">
                  Skip Reason:
                </span>{' '}
                <span className="text-yellow-700">{step.skip_reason}</span>
              </div>
            )}
          </div>

          {/* Expand/Collapse Icon */}
          <div className="ml-4">
            <svg
              className={`w-6 h-6 text-gray-400 transition-transform ${
                isExpanded ? 'transform rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-200 pt-4">
          {/* Data Preview Section */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-900">Step Data</h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRawData(!showRawData);
                }}
                className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
              >
                {showRawData ? 'Show Summary' : 'Show Raw JSON'}
              </button>
            </div>
            {renderDataPreview()}
          </div>
        </div>
      )}
    </div>
  );
}
