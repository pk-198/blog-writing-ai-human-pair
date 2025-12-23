/**
 * ProgressAnimation - Enhanced loading indicator with step-specific messages
 * Shows animated progress while AI processes a step
 */

import React, { useState, useEffect } from 'react';

interface ProgressAnimationProps {
  stepNumber: number;
  stepName: string;
  message?: string;
  estimatedSeconds?: number;
}

const stepMessages: Record<number, string[]> = {
  1: [
    'Fetching top 10 SERP results from Tavily...',
    'Analyzing search intent patterns...',
    'Identifying user intent types...',
    'Generating recommendations...'
  ],
  2: [
    'Fetching top 5 competitor URLs...',
    'Extracting full page content...',
    'Analyzing competitor structure...',
    'Calculating word counts...'
  ],
  3: [
    'Loading competitor data...',
    'Identifying content patterns...',
    'Extracting quintessential elements...',
    'Generating analysis report...'
  ],
  // Add more step-specific messages as needed
};

export default function ProgressAnimation({
  stepNumber,
  stepName,
  message,
  estimatedSeconds = 30
}: ProgressAnimationProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const messages = stepMessages[stepNumber] || [
    `Processing ${stepName}...`,
    'Analyzing data...',
    'Generating results...',
    'Finalizing output...'
  ];

  useEffect(() => {
    // Rotate through messages
    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, estimatedSeconds * 1000 / messages.length);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev; // Cap at 95% until actual completion
        return prev + (100 - prev) * 0.1;
      });
    }, 500);

    return () => {
      clearInterval(messageInterval);
      clearInterval(progressInterval);
    };
  }, [messages.length, estimatedSeconds]);

  return (
    <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-4">
        {/* Animated Spinner */}
        <div className="flex-shrink-0">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>

        <div className="flex-1">
          {/* Header */}
          <h3 className="font-semibold text-blue-900 mb-2">
            Processing Step {stepNumber}: {stepName}
          </h3>

          {/* Animated Message */}
          <div className="min-h-[24px] mb-3">
            <p className="text-blue-700 text-sm animate-pulse">
              {message || messages[currentMessageIndex]}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Progress Percentage */}
          <p className="text-xs text-blue-600 mt-1 text-right">
            {Math.round(progress)}% complete
          </p>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-4 pt-4 border-t border-blue-200">
        <p className="text-xs text-blue-600 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          This may take {estimatedSeconds}+ seconds. Progress is auto-saved.
        </p>
      </div>
    </div>
  );
}
