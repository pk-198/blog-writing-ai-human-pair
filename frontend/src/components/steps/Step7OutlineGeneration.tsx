/**
 * Step 7: Outline Generation
 * AI creates comprehensive blog outline with H1/H2/H3 hierarchy
 * Owner: AI
 * Includes unsaved changes detection for editable AI output
 */

'use client';

import React, { useState } from 'react';
import StepContainer from '../shared/StepContainer';
import AIOutputDisplay from '../shared/AIOutputDisplay';
import EditableOutput from '../shared/EditableOutput';
import SuccessBanner from '../shared/SuccessBanner';
import ErrorBanner from '../shared/ErrorBanner';
import ProgressAnimation from '../shared/ProgressAnimation';
import StepNavigation from '../shared/StepNavigation';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';

interface Step7Props {
  sessionId: string;
  initialData?: any;
}

export default function Step7OutlineGeneration({ sessionId, initialData }: Step7Props) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionComplete, setExecutionComplete] = useState(
    initialData && Object.keys(initialData).length > 0
  );
  const [stepData, setStepData] = useState(initialData || null);
  const [error, setError] = useState<string | null>(null);

  // Unsaved changes tracking for editable AI output
  const { hasUnsavedChanges, setHasUnsavedChanges, resetUnsavedChanges } = useUnsavedChanges();

  const handleExecute = async () => {
    setIsExecuting(true);
    setError(null);

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const result = await api.executeStep7OutlineGeneration(sessionId, token);

      if (result.success) {
        setStepData(result.data);
        setExecutionComplete(true);
      } else {
        setError(result.error || 'Step execution failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSkip = async () => {
    const reason = prompt('Why are you skipping this step?');
    if (!reason) return;

    try {
      const token = getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      await api.skipStep(7, { session_id: sessionId, reason }, token);
      setExecutionComplete(true);
    } catch (err: any) {
      setError(err.message || 'Failed to skip step');
    }
  };

  const handleSaveAndPause = async () => {
    window.location.href = '/creator/dashboard';
  };

  const renderOutline = (outline: any) => {
    if (!outline) return null;

    return (
      <div className="space-y-4">
        {/* H1 - Main Title */}
        {outline.h1 && (
          <div className="border-l-4 border-blue-600 pl-4 py-2 bg-blue-50">
            <div className="text-xs font-semibold text-blue-600 mb-1">H1 (Main Title)</div>
            <div className="text-lg font-bold text-gray-900">{outline.h1}</div>
          </div>
        )}

        {/* Sections with H2/H3 */}
        {outline.sections && outline.sections.map((section: any, idx: number) => (
          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
            {/* H2 - Section Heading */}
            <div className="border-l-4 border-green-600 pl-4 py-2 bg-green-50 mb-3">
              <div className="text-xs font-semibold text-green-600 mb-1">H2 (Section {idx + 1})</div>
              <div className="text-base font-semibold text-gray-900">{section.h2}</div>
              {section.content_type && (
                <div className="text-xs text-gray-600 mt-1">
                  Content Type: <span className="font-medium">{section.content_type}</span>
                </div>
              )}
            </div>

            {/* H3 - Subsections */}
            {section.h3 && section.h3.length > 0 && (
              <div className="ml-4 space-y-2">
                {section.h3.map((subsection: any, subIdx: number) => (
                  <div key={subIdx} className="border-l-4 border-purple-400 pl-4 py-1 bg-purple-50">
                    <div className="text-xs font-semibold text-purple-600 mb-1">H3 (Subsection)</div>
                    <div className="text-sm font-medium text-gray-800">
                      {typeof subsection === 'string' ? subsection : subsection.title || subsection.heading}
                    </div>
                    {typeof subsection === 'object' && subsection.content_type && (
                      <div className="text-xs text-gray-600 mt-1">
                        Type: <span className="font-medium">{subsection.content_type}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Special Sections */}
        {outline.special_sections && typeof outline.special_sections === 'object' && Object.keys(outline.special_sections).length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              <span>⭐</span>
              Special Sections
            </h4>
            <div className="space-y-3">
              {Object.entries(outline.special_sections).map(([key, value]: [string, any]) => (
                <div key={key} className="bg-white rounded p-3 border border-yellow-300">
                  <div className="font-semibold text-yellow-900 capitalize mb-1">{key}</div>
                  <div className="text-sm text-yellow-800 space-y-1">
                    {typeof value === 'object' ? (
                      Object.entries(value).map(([prop, val]: [string, any]) => (
                        <div key={prop} className="flex gap-2">
                          <span className="font-medium">{prop.replace(/_/g, ' ')}:</span>
                          <span>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                        </div>
                      ))
                    ) : (
                      <span>{String(value)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <StepContainer
      stepNumber={7}
      stepName="Outline Generation"
      owner="AI"
      description="AI creates a comprehensive blog outline with H1/H2/H3 hierarchy, content type suggestions, and special sections (glossary, FAQs, myths)."
    >
      {/* Instructions */}
      {!executionComplete && !isExecuting && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">What happens in this step:</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
            <li>AI generates hierarchical outline (H1, H2, H3 structure)</li>
            <li>Recommends content types for each section (list, narrative, data-driven)</li>
            <li>Includes placeholders for glossary, FAQs, and myths sections</li>
            <li>Based on competitor analysis, secondary keywords, and collected data</li>
          </ul>
        </div>
      )}

      {/* Loading State */}
      {isExecuting && (
        <ProgressAnimation
          stepNumber={7}
          stepName="Outline Generation"
          estimatedSeconds={35}
        />
      )}

      {/* Error State */}
      {error && (
        <ErrorBanner
          error={error}
          onRetry={handleExecute}
          stepNumber={7}
          stepName="Outline Generation"
        />
      )}

      {/* Results Display */}
      {executionComplete && stepData && !isExecuting && (
        <div className="space-y-6">
          {/* Success Banner */}
          <SuccessBanner
            stepNumber={7}
            stepName="Outline Generation"
            message="Generated comprehensive blog outline with H1/H2/H3 structure"
          />

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">
              Blog Outline Structure
            </h3>
            {stepData.outline?.sections && (
              <span className="text-sm text-gray-600">
                {stepData.outline.sections.length} main sections
              </span>
            )}
          </div>

          {/* Rendered Outline */}
          {stepData.outline && renderOutline(stepData.outline)}

          {/* Content Types Legend */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Content Type Guide:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">List:</span> Bullet points, numbered steps</div>
              <div><span className="font-medium">Narrative:</span> Story-based, flowing text</div>
              <div><span className="font-medium">Data-driven:</span> Stats, charts, tables</div>
              <div><span className="font-medium">Comparison:</span> Side-by-side analysis</div>
            </div>
          </div>

          {/* Summary */}
          {stepData.summary && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">Summary</h4>
              <p className="text-green-800">{stepData.summary}</p>
            </div>
          )}

          {/* Full Outline Data - Editable */}
          <EditableOutput
            stepNumber={7}
            sessionId={sessionId}
            title="Complete Outline Data (Editable JSON)"
            initialData={stepData}
            dataKey="outline"
            onSave={(updatedData) => {
              setStepData({ ...stepData, ...updatedData });
            }}
            onEditStart={() => setHasUnsavedChanges(true)}
            onSaveSuccess={() => resetUnsavedChanges()}
          />
        </div>
      )}

      {/* Navigation */}
      <StepNavigation
        sessionId={sessionId}
        currentStep={7}
        isExecuting={isExecuting}
        canExecute={!executionComplete}
        canSkip={false}
        onExecute={handleExecute}
        onSkip={handleSkip}
        onSaveAndPause={handleSaveAndPause}
        executionComplete={executionComplete}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </StepContainer>
  );
}
