/**
 * LoadingSpinner - Loading state indicator for async operations
 */

import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  message = 'Loading...',
  size = 'medium',
  fullScreen = false
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const spinnerSize = sizeClasses[size];

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className={`${spinnerSize} relative`}>
        <div className="absolute inset-0 rounded-full border-4 border-blue-200"></div>
        <div
          className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
        ></div>
      </div>
      {message && (
        <p className="text-gray-600 font-medium text-center">{message}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        {spinner}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {spinner}
    </div>
  );
}
