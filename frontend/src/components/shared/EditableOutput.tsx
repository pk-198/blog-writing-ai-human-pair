/**
 * Editable Output Component
 * Displays AI-generated content with edit capability for critical steps
 */

'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface EditableOutputProps {
  stepNumber: number;
  sessionId: string;
  title: string;
  initialData: any;
  dataKey: string; // The key in step data to update (e.g., 'recommended_direction', 'outline', etc.)
  onSave?: (updatedData: any) => void;
  computeAdditionalFields?: (editedData: any) => Record<string, any>; // Optional function to compute additional fields to save
  onEditStart?: () => void; // Callback when user starts editing (sets dirty flag)
  onSaveSuccess?: () => void; // Callback when save succeeds (resets dirty flag)
}

export default function EditableOutput({
  stepNumber,
  sessionId,
  title,
  initialData,
  dataKey,
  onSave,
  computeAdditionalFields,
  onEditStart,
  onSaveSuccess
}: EditableOutputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize with current data only if not currently editing
    // This prevents losing user edits if parent re-renders
    if (!isEditing) {
      const content = typeof initialData === 'string'
        ? initialData
        : JSON.stringify(initialData, null, 2);
      setEditedContent(content);
    }
  }, [initialData, isEditing]);

  // Cleanup timeout on unmount to prevent memory leak
  useEffect(() => {
    let successTimeout: NodeJS.Timeout;

    if (saveSuccess) {
      successTimeout = setTimeout(() => setSaveSuccess(false), 3000);
    }

    return () => {
      if (successTimeout) {
        clearTimeout(successTimeout);
      }
    };
  }, [saveSuccess]);

  const handleEdit = () => {
    setIsEditing(true);
    setSaveSuccess(false);
    setError(null);
    // Notify parent that editing has started (sets dirty flag)
    if (onEditStart) {
      onEditStart();
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original content
    const content = typeof initialData === 'string'
      ? initialData
      : JSON.stringify(initialData, null, 2);
    setEditedContent(content);
    setError(null);
    // Reset dirty flag when user cancels editing
    if (onSaveSuccess) {
      onSaveSuccess();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Parse content if it was JSON
      let parsedContent;
      if (typeof initialData === 'object') {
        try {
          parsedContent = JSON.parse(editedContent);
        } catch (e) {
          throw new Error('Invalid JSON format. Please check your edits.');
        }
      } else {
        parsedContent = editedContent;
      }

      // Update step data via API
      let updatePayload: Record<string, any> = { [dataKey]: parsedContent };

      // Add computed fields if function provided
      if (computeAdditionalFields) {
        const additionalFields = computeAdditionalFields(parsedContent);
        updatePayload = { ...updatePayload, ...additionalFields };
      }

      await api.updateStepData(stepNumber, sessionId, updatePayload, token);

      setSaveSuccess(true);
      setIsEditing(false);

      // Reset dirty flag on successful save
      if (onSaveSuccess) {
        onSaveSuccess();
      }

      // Call parent callback if provided
      if (onSave) {
        onSave(parsedContent);
      }

      // Success message auto-hides via useEffect
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
      // Keep editing mode open so user can retry
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✏️</span>
          <h4 className="font-semibold text-gray-900">{title}</h4>
          {saveSuccess && (
            <span className="text-sm text-green-600 font-medium">✓ Saved</span>
          )}
        </div>
        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
          >
            Edit Content
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {!isEditing ? (
        <div className="bg-white rounded border border-yellow-200 p-4">
          <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 overflow-x-auto">
            {typeof initialData === 'string'
              ? initialData
              : JSON.stringify(initialData, null, 2)}
          </pre>
        </div>
      ) : (
        <div>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-96 px-4 py-3 border-2 border-yellow-400 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent font-mono text-sm resize-y"
            placeholder="Edit the content here..."
          />
          <p className="text-xs text-gray-600 mt-1">
            {typeof initialData === 'object'
              ? 'Editing JSON format - ensure valid JSON syntax'
              : 'Editing text content'}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>💡 Note:</strong> Changes saved here will be used in all subsequent steps.
          Review carefully before saving.
        </p>
      </div>
    </div>
  );
}
