// Modal dialog to warn users about unsaved changes
// Blocks navigation until user manually saves their edits

import React from 'react';

interface UnsavedChangesDialogProps {
  isOpen: boolean; // Whether dialog is visible
  onClose: () => void; // Handler to dismiss dialog
}

/**
 * Warning dialog displayed when user tries to navigate with unsaved changes
 *
 * Features:
 * - Modal overlay that blocks interaction
 * - Clear warning message
 * - Single "OK" button to dismiss and stay on page
 * - Forces user to manually save before navigating
 */
export default function UnsavedChangesDialog({
  isOpen,
  onClose,
}: UnsavedChangesDialogProps) {
  // Don't render if dialog is closed
  if (!isOpen) return null;

  return (
    // Modal overlay with semi-transparent background
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose} // Close when clicking overlay
    >
      {/* Dialog content */}
      <div
        className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()} // Prevent close when clicking dialog
      >
        {/* Warning icon */}
        <div className="flex items-center mb-4">
          <svg
            className="w-6 h-6 text-yellow-500 mr-3"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">
            Unsaved Changes
          </h3>
        </div>

        {/* Warning message */}
        <p className="text-gray-700 mb-6">
          You have unsaved changes. Please save your changes using the{' '}
          <strong>&quot;Save Changes&quot;</strong> button before navigating
          away.
        </p>

        {/* OK button */}
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
