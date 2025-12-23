/**
 * StepContainer - Wrapper component for all workflow steps
 * Provides consistent layout, styling, and structure
 */

import React from 'react';

interface StepContainerProps {
  stepNumber: number;
  stepName: string;
  owner: 'AI' | 'Human' | 'AI+Human';
  children: React.ReactNode;
  description?: string;
}

export default function StepContainer({
  stepNumber,
  stepName,
  owner,
  children,
  description
}: StepContainerProps) {
  const ownerColors = {
    'AI': 'bg-blue-100 text-blue-800 border-blue-300',
    'Human': 'bg-green-100 text-green-800 border-green-300',
    'AI+Human': 'bg-purple-100 text-purple-800 border-purple-300'
  };

  const ownerColor = ownerColors[owner];

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Step Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl font-bold text-gray-900">
                Step {stepNumber}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium border ${ownerColor}`}>
                {owner}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-800 mb-2">
              {stepName}
            </h1>
            {description && (
              <p className="text-gray-600 text-sm leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">
              Progress: Step {stepNumber} of 22
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(stepNumber / 22) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {children}
      </div>
    </div>
  );
}
