// Custom React hook to track and warn about unsaved changes
// Provides dirty flag tracking and browser navigation warning

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to track unsaved changes and warn users before navigation
 *
 * Features:
 * - Simple dirty flag to track if content has been modified
 * - Browser navigation warning (beforeunload event)
 * - Methods to set/reset unsaved state
 *
 * @returns Object with hasUnsavedChanges flag and control methods
 */
export function useUnsavedChanges() {
  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Reset unsaved changes flag (call after successful save)
  const resetUnsavedChanges = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  // Browser navigation warning effect
  useEffect(() => {
    // Handler for browser navigation/close/refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Standard way to trigger browser warning dialog
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
        return ''; // Some browsers use return value
      }
    };

    // Add event listener when there are unsaved changes
    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    // Cleanup: remove event listener
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  return {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    resetUnsavedChanges,
  };
}
